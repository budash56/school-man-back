import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { StudentsRepository } from '../students/students.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { TimetableSlotRepository } from '../timetable_slots/timetable_slots.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { Attendance } from './attendance.entity';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';
import { Courses } from '../courses/courses.entity';
import { AccessService } from '../auth/access.service';
import { SchoolYearsRepository } from '../school_years/school_years.repository';

export type AttendanceResponse = {
  attendanceId: number;
  studentId: number;
  courseId: number;
  slotId: number | null;
  date: string;
  status: 'P' | 'A' | 'AE';
  recordedById: string | null;
  reasonNote: string | null;
  excusedAt: Date | null;
};

type ActingUser = {
  userId: number;
  nationalId: string;
  role: string;
};

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly timetableSlotRepository: TimetableSlotRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
  ) {}

  async findAll(
    query: AttendanceQueryDto,
    currentUser: ActingUser,
  ): Promise<PaginatedResult<AttendanceResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);
    const scope =
      currentUser.role === 'teacher' ? (query.scope ?? 'own') : query.scope;

    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.recordedBy', 'recordedBy')
      .leftJoin('attendance.course', 'course')
      .orderBy('attendance.date', 'DESC')
      .addOrderBy('attendance.attendanceId', 'DESC');

    if (query.studentId !== undefined) {
      qb.andWhere('attendance.studentId = :studentId', {
        studentId: Number(query.studentId),
      });
    }

    if (query.courseId !== undefined) {
      qb.andWhere('attendance.courseId = :courseId', {
        courseId: Number(query.courseId),
      });
    }

    if (query.status !== undefined) {
      qb.andWhere('attendance.status = :status', { status: query.status });
    }

    if (query.from !== undefined) {
      qb.andWhere('attendance.date >= :from', { from: query.from });
    }

    if (query.to !== undefined) {
      qb.andWhere('attendance.date <= :to', { to: query.to });
    }

    if (currentUser.role === 'teacher') {
      const accessService = this.createAccessHelper();
      const teacherCourseIds = await accessService.courseIdsForTeacher(
        currentUser.userId,
      );

      if (query.courseId !== undefined) {
        if (!teacherCourseIds.includes(Number(query.courseId))) {
          return buildPaginationResult([], 0, page, pageSize);
        }
      }

      if ((scope ?? 'own') === 'group') {
        const classGroupIds = await accessService.classGroupIdsForTeacher(
          currentUser.userId,
        );
        if (classGroupIds.length === 0) {
          return buildPaginationResult([], 0, page, pageSize);
        }
        qb.andWhere('course.classGroupId IN (:...allowedClassGroupIds)', {
          allowedClassGroupIds: classGroupIds.map((id) => Number(id)),
        });
      } else {
        if (teacherCourseIds.length === 0) {
          return buildPaginationResult([], 0, page, pageSize);
        }
        qb.andWhere('attendance.courseId IN (:...allowedCourseIds)', {
          allowedCourseIds: teacherCourseIds.map((id) => Number(id)),
        });
      }
    }

    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [records, total] = await qb.getManyAndCount();
    return buildPaginationResult(
      records.map((record) => this.toResponse(record)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(
    id: number,
    currentUser: ActingUser,
  ): Promise<AttendanceResponse> {
    const attendance = await this.attendanceRepository.findOne({
      where: { attendanceId: id }, // numeric now
      relations: { recordedBy: true, course: true },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.assertTeacherCanReadCourse(currentUser, attendance.course);

    return this.toResponse(attendance);
  }

  async create(
    dto: CreateAttendanceDto,
    currentUser: ActingUser,
  ): Promise<AttendanceResponse> {
    // Students & Courses repositories still expose string PKs → compare with strings
    const student = await this.studentsRepository.findOne({
      where: { studentId: dto.studentId.toString() },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const course = await this.coursesRepository.findOne({
      where: { courseId: dto.courseId.toString() },
      relations: {
        classGroup: true,
        courseInstance: true,
        teacher: true,
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.assertTeacherCanMutateCourse(
      currentUser,
      course,
      Number(dto.courseId),
    );

    const slot = await this.timetableSlotRepository.findOne({
      where: { slotId: dto.slotId },
    });
    if (!slot) {
      throw new NotFoundException('Timetable slot not found');
    }

    this.assertSlotMatchesDate(slot.dayOfWeek, dto.date);

    const requiredClassGroupId = course.classGroup?.classGroupId;
    const requiredSchoolYearId = course.courseInstance?.schoolYearId;
    if (!requiredClassGroupId || !requiredSchoolYearId) {
      throw new ConflictException('Course is missing schedule information');
    }

    const schoolYearId = Number(requiredSchoolYearId);
    if (!Number.isFinite(schoolYearId)) {
      throw new ConflictException('Course is missing schedule information');
    }

    await this.assertYearWritable(schoolYearId, currentUser);

    const enrollment = await this.enrollmentsRepository.findOne({
      where: {
        studentId: student.studentId,
        classGroupId: requiredClassGroupId,
        schoolYearId: requiredSchoolYearId,
        active: true,
      },
    });

    if (!enrollment) {
      throw new ConflictException(
        'Student is not actively enrolled in this class group for the school year',
      );
    }

    const recordedBy = course.teacher ?? null;

    const entity = this.attendanceRepository.create({
      studentId: Number(student.studentId), // number
      courseId: Number(dto.courseId), // number
      date: dto.date, // 'YYYY-MM-DD'
      status: dto.status, // 'P' | 'A' | 'AE'
      slotId: dto.slotId ?? null, // number | null
      // reasonNote: dto.reasonNote ?? null,
      // relation (Users). If no course.teacher, fallback to currentUser if present.
      recordedBy:
        recordedBy ??
        (currentUser?.nationalId
          ? ({ nationalId: currentUser.nationalId } as any)
          : null),
    });

    try {
      const saved = await this.attendanceRepository.save(entity);
      return this.findOne(saved.attendanceId, currentUser);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Attendance already recorded for this student, slot, and date',
      );
      // TypeScript: to satisfy return type if mapper didn’t throw for some reason
      throw error;
    }
  }

  async update(
    id: number,
    dto: UpdateAttendanceDto,
    currentUser: ActingUser,
  ): Promise<AttendanceResponse> {
    const attendance = await this.attendanceRepository.findOne({
      where: { attendanceId: id }, // numeric
      relations: { recordedBy: true, course: true },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.assertTeacherCanMutateCourse(currentUser, attendance.course);

    if (dto.status !== undefined && dto.status !== attendance.status) {
      if (attendance.status === 'A' && dto.status === 'AE') {
        const recordedById = attendance.recordedBy?.nationalId;
        const canOverride =
          currentUser.role === 'admin' || currentUser.role === 'coordinator';
        if (
          !recordedById ||
          (recordedById !== currentUser.nationalId && !canOverride)
        ) {
          throw new ForbiddenException(
            'Only the recording teacher can excuse an absence',
          );
        }
        attendance.excusedAt = dto.excusedAt
          ? this.parseDate(dto.excusedAt)
          : new Date();
      } else if (attendance.status === 'A' && dto.status !== 'AE') {
        attendance.excusedAt = null;
      }
      attendance.status = dto.status;
    }

    if (dto.reasonNote !== undefined) {
      attendance.reasonNote = dto.reasonNote;
    }

    if (dto.excusedAt !== undefined && attendance.status === 'AE') {
      attendance.excusedAt = this.parseDate(dto.excusedAt);
    }

    // Courses repo still uses string PK → compare with string
    const course = await this.coursesRepository.findOne({
      where: { courseId: attendance.courseId.toString() },
      relations: { courseInstance: true },
    });

    if (!course || !course.courseInstance?.schoolYearId) {
      throw new ConflictException('Course is missing schedule information');
    }

    const schoolYearId = Number(course.courseInstance.schoolYearId);
    if (!Number.isFinite(schoolYearId)) {
      throw new ConflictException('Course is missing schedule information');
    }

    await this.assertYearWritable(schoolYearId, currentUser);

    const saved = await this.attendanceRepository.save(attendance);
    return this.toResponse(saved);
  }

  async remove(
    id: number,
    currentUser: ActingUser,
  ): Promise<{ deleted: true }> {
    const attendance = await this.attendanceRepository.findOne({
      where: { attendanceId: id }, // numeric
      relations: { course: { courseInstance: true } },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.assertTeacherCanMutateCourse(currentUser, attendance.course);

    const course =
      attendance.course ??
      (await this.coursesRepository.findOne({
        where: { courseId: attendance.courseId.toString() }, // Courses PK still string
        relations: { courseInstance: true },
      }));

    if (!course || !course.courseInstance?.schoolYearId) {
      throw new ConflictException('Course is missing schedule information');
    }

    const schoolYearId = Number(course.courseInstance.schoolYearId);
    if (!Number.isFinite(schoolYearId)) {
      throw new ConflictException('Course is missing schedule information');
    }

    await this.assertYearWritable(schoolYearId, currentUser);

    await this.attendanceRepository.remove(attendance);
    return { deleted: true };
  }

  private assertSlotMatchesDate(slotDayOfWeek: number, date: string): void {
    const weekday = this.getIsoDay(date);
    if (slotDayOfWeek !== weekday) {
      throw new BadRequestException(
        'Attendance date does not match the slot day of week',
      );
    }
  }

  private getIsoDay(date: string): number {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid attendance date');
    }
    const day = parsed.getUTCDay();
    return day === 0 ? 7 : day;
  }

  private parseDate(value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Invalid date value');
    }
    return parsed;
  }

  private async assertYearWritable(
    schoolYearId: number,
    user: { role: string },
  ): Promise<void> {
    // School years repo still string PK → compare with string
    const year = await this.schoolYearsRepository.findOne({
      where: { schoolYearId: schoolYearId.toString() },
    });

    if (!year) {
      throw new NotFoundException('School year not found');
    }

    if (year.isActive) {
      return;
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('Past years are read-only');
    }
  }

  private async assertTeacherCanMutateCourse(
    user: ActingUser,
    course: Courses | null,
    courseIdOverride?: number,
  ): Promise<void> {
    if (user.role !== 'teacher') {
      return;
    }

    if (!course && courseIdOverride === undefined) {
      throw new ForbiddenException(
        'You are not allowed to modify attendance for this course',
      );
    }

    const courseId =
      courseIdOverride ??
      (course?.courseId ? Number(course.courseId) : Number.NaN);

    if (!Number.isFinite(courseId)) {
      throw new ForbiddenException(
        'You are not allowed to modify attendance for this course',
      );
    }

    const canModify = await this.createAccessHelper().isTeacherOfCourse(
      user.userId,
      courseId,
    );
    if (!canModify) {
      throw new ForbiddenException(
        'You are not allowed to modify attendance for this course',
      );
    }
  }

  private async assertTeacherCanReadCourse(
    user: ActingUser,
    course: Courses | null,
  ): Promise<void> {
    if (user.role !== 'teacher') {
      return;
    }

    if (!course) {
      throw new ForbiddenException(
        'You are not allowed to access this attendance record',
      );
    }

    const accessService = this.createAccessHelper();
    const [teachesCourse, classGroupIds] = await Promise.all([
      accessService.isTeacherOfCourse(user.userId, Number(course.courseId)),
      accessService.classGroupIdsForTeacher(user.userId),
    ]);

    if (teachesCourse) {
      return;
    }

    const classGroupId = course.classGroupId
      ? Number(course.classGroupId)
      : undefined;
    if (classGroupId !== undefined && classGroupIds.includes(classGroupId)) {
      return;
    }

    throw new ForbiddenException(
      'You are not allowed to access this attendance record',
    );
  }

  private toResponse(record: Attendance): AttendanceResponse {
    return {
      attendanceId: Number(record.attendanceId),
      studentId: Number(record.studentId),
      courseId: Number(record.courseId),
      slotId: record.slotId != null ? Number(record.slotId) : null,
      date: record.date,
      status: record.status,
      recordedById: record.recordedBy?.nationalId ?? null,
      reasonNote: record.reasonNote ?? null,
      excusedAt: record.excusedAt ?? null,
    };
  }

  private createAccessHelper(): AccessService {
    return new AccessService(this.coursesRepository);
  }
}
