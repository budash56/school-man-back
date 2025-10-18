import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceQueryDto, ATTENDANCE_DEFAULT_PAGE_SIZE, ATTENDANCE_MAX_PAGE_SIZE } from './dto/attendance-query.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { StudentsRepository } from '../students/students.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { TimetableSlotRepository } from '../timetable_slots/timetable_slots.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { DbErrorMapper } from '../database/db-error.mapper';
import { Attendance } from './attendance.entity';

type PaginationResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

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

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly timetableSlotRepository: TimetableSlotRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
  ) {}

  async findAll(query: AttendanceQueryDto): Promise<PaginationResult<AttendanceResponse>> {
    const page = this.resolvePage(query.page);
    const pageSize = this.resolvePageSize(query.pageSize);

    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.recordedBy', 'recordedBy')
      .orderBy('attendance.date', 'DESC')
      .addOrderBy('attendance.attendanceId', 'DESC');

    if (query.studentId !== undefined) {
      qb.andWhere('attendance.studentId = :studentId', {
        studentId: query.studentId.toString(),
      });
    }

    if (query.courseId !== undefined) {
      qb.andWhere('attendance.courseId = :courseId', {
        courseId: query.courseId.toString(),
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

    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [records, total] = await qb.getManyAndCount();
    return {
      data: records.map((record) => this.toResponse(record)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: number): Promise<AttendanceResponse> {
    const attendance = await this.attendanceRepository.findOne({
      where: { attendanceId: id.toString() },
      relations: { recordedBy: true },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return this.toResponse(attendance);
  }

  async create(dto: CreateAttendanceDto): Promise<AttendanceResponse> {
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

    const enrollment = await this.enrollmentsRepository.findOne({
      where: {
        studentId: student.studentId,
        classGroupId: requiredClassGroupId,
        schoolYearId: requiredSchoolYearId,
        active: true,
      },
    });

    if (!enrollment) {
      throw new ConflictException('Student is not actively enrolled in this class group for the school year');
    }

    const recordedBy = course.teacher ?? null;

    const entity = this.attendanceRepository.create({
      studentId: student.studentId,
      courseId: course.courseId,
      slotId: slot.slotId.toString(),
      date: dto.date,
      status: dto.status,
      recordedBy,
    });

    try {
      const saved = await this.attendanceRepository.save(entity);
      return this.findOne(Number(saved.attendanceId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Attendance already recorded for this student, slot, and date',
      );
    }
  }

  async update(id: number, dto: UpdateAttendanceDto): Promise<AttendanceResponse> {
    const attendance = await this.attendanceRepository.findOne({
      where: { attendanceId: id.toString() },
      relations: { recordedBy: true },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    if (dto.status !== undefined && dto.status !== attendance.status) {
      if (attendance.status === 'A' && dto.status === 'AE') {
        const recordedById = attendance.recordedBy?.nationalId;
        if (!dto.requestingUserId || !recordedById || recordedById !== dto.requestingUserId) {
          throw new ForbiddenException('Only the recording teacher can excuse an absence');
        }
        attendance.excusedAt = dto.excusedAt ? this.parseDate(dto.excusedAt) : new Date();
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

    const saved = await this.attendanceRepository.save(attendance);
    return this.toResponse(saved);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const attendance = await this.attendanceRepository.findOne({
      where: { attendanceId: id.toString() },
    });

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    await this.attendanceRepository.remove(attendance);
    return { deleted: true };
  }

  private assertSlotMatchesDate(slotDayOfWeek: number, date: string): void {
    const weekday = this.getIsoDay(date);
    if (slotDayOfWeek !== weekday) {
      throw new BadRequestException('Attendance date does not match the slot day of week');
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

  private resolvePage(rawPage?: number): number {
    if (!rawPage || rawPage < 1) {
      return 1;
    }
    return rawPage;
  }

  private resolvePageSize(rawPageSize?: number): number {
    if (!rawPageSize || rawPageSize < 1) {
      return ATTENDANCE_DEFAULT_PAGE_SIZE;
    }
    return Math.min(rawPageSize, ATTENDANCE_MAX_PAGE_SIZE);
  }

  private toResponse(record: Attendance): AttendanceResponse {
    return {
      attendanceId: Number(record.attendanceId),
      studentId: Number(record.studentId),
      courseId: Number(record.courseId),
      slotId: record.slotId ? Number(record.slotId) : null,
      date: record.date,
      status: record.status,
      recordedById: record.recordedBy?.nationalId ?? null,
      reasonNote: record.reasonNote ?? null,
      excusedAt: record.excusedAt ?? null,
    };
  }
}
