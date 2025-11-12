import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { StudentsRepository } from '../students/students.repository';
import { TermsRepository } from '../terms/terms.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { Grades } from './grades.entity';
import { GradesRepository } from './grades.repository';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradesQueryDto } from './dto/grades-query.dto';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';
import { AccessService } from '../auth/access.service';

type NumericMark = 5 | 4 | 3 | 1;
type LetterMark = 'S' | 'A' | 'B' | 'J';
const NUMERIC_MARK_DOMAIN: NumericMark[] = [5, 4, 3, 1];
const NUMERIC_TO_LETTER: Record<NumericMark, LetterMark> = {
  5: 'S',
  4: 'A',
  3: 'B',
  1: 'J',
};

type ActingUser = {
  userId: number;
  role: string;
};

export type GradeResponse = {
  gradeId: number;
  studentId: number;
  courseId: number;
  termId: number;
  schoolYearId: number | null;
  mark: LetterMark;
  comment: string | null;
};

@Injectable()
export class GradesService {
  constructor(
    private readonly gradesRepository: GradesRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly termsRepository: TermsRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly access: AccessService,
  ) {}

  async findAll(
    query: GradesQueryDto,
    currentUser: ActingUser,
  ): Promise<PaginatedResult<GradeResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.gradesRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.term', 'term')
      .leftJoinAndSelect('grade.course', 'course')
      .leftJoinAndSelect('course.courseInstance', 'courseInstance')
      .orderBy('grade.createdAt', 'DESC')
      .addOrderBy('grade.gradeId', 'DESC');

    if (query.studentId !== undefined) {
      qb.andWhere('grade.studentId = :studentId', {
        studentId: query.studentId.toString(),
      });
    }

    if (query.courseId !== undefined) {
      qb.andWhere('grade.courseId = :courseId', {
        courseId: query.courseId.toString(),
      });
    }

    if (query.termId !== undefined) {
      qb.andWhere('grade.termId = :termId', {
        termId: query.termId.toString(),
      });
    }

    if (query.schoolYearId !== undefined) {
      qb.andWhere('term.schoolYearId = :schoolYearId', {
        schoolYearId: query.schoolYearId.toString(),
      });
    }

    if (currentUser.role === 'teacher') {
      const teacherCourseIds = await this.access.courseIdsForTeacher(
        currentUser.userId,
      );

      if (query.courseId !== undefined) {
        if (!teacherCourseIds.includes(Number(query.courseId))) {
          return buildPaginationResult([], 0, page, pageSize);
        }
      } else {
        if (teacherCourseIds.length === 0) {
          return buildPaginationResult([], 0, page, pageSize);
        }

        qb.andWhere('grade.courseId IN (:...allowedCourseIds)', {
          allowedCourseIds: teacherCourseIds.map((id) => id.toString()),
        });
      }
    }

    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [grades, total] = await qb.getManyAndCount();
    return buildPaginationResult(
      grades.map((grade) => this.toResponse(grade)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: number): Promise<GradeResponse> {
    const grade = await this.gradesRepository.findOne({
      where: { gradeId: id.toString() },
      relations: { term: true },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    return this.toResponse(grade);
  }

  async create(
    dto: CreateGradeDto,
    currentUser: ActingUser,
  ): Promise<GradeResponse> {
    if (currentUser.role === 'coordinator') {
      throw new ForbiddenException('Coordinators cannot modify grades');
    }

    const student = await this.studentsRepository.findOne({
      where: { studentId: dto.studentId.toString() },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const course = await this.coursesRepository.findOne({
      where: { courseId: dto.courseId.toString() },
      relations: { classGroup: true, courseInstance: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (currentUser.role === 'teacher') {
      const canModify = await this.access.isTeacherOfCourse(
        currentUser.userId,
        Number(course.courseId),
      );
      if (!canModify) {
        throw new ForbiddenException(
          'You are not allowed to record grades for this course',
        );
      }
    }

    const term = await this.termsRepository.findOne({
      where: { termId: dto.termId.toString() },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const courseSchoolYear = course.courseInstance?.schoolYearId;
    const courseClassGroupId = course.classGroup?.classGroupId;

    if (!courseSchoolYear || !courseClassGroupId) {
      throw new ConflictException('Course schedule is incomplete');
    }

    if (courseSchoolYear !== term.schoolYearId) {
      throw new ConflictException(
        'Course and term belong to different school years',
      );
    }

    const enrollment = await this.enrollmentsRepository.findOne({
      where: {
        studentId: student.studentId,
        classGroupId: courseClassGroupId,
        schoolYearId: term.schoolYearId,
        active: true,
      },
    });

    if (!enrollment) {
      throw new ConflictException(
        'Student is not actively enrolled in this class group for the term school year',
      );
    }

    const schoolYearId = Number(courseSchoolYear);
    if (!Number.isFinite(schoolYearId)) {
      throw new ConflictException('Course schedule is incomplete');
    }

    await this.assertYearWritable(schoolYearId, currentUser);

    const entity = this.gradesRepository.create({
      studentId: student.studentId,
      courseId: course.courseId,
      termId: term.termId,
      mark: dto.mark,
      comment: dto.comment ?? null,
    });

    try {
      const saved = await this.gradesRepository.save(entity);
      return this.toResponse({ ...saved, term } as Grades);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A grade for this student, course, and term already exists',
      );
    }
  }

  async update(
    id: number,
    dto: UpdateGradeDto,
    currentUser: ActingUser,
  ): Promise<GradeResponse> {
    if (currentUser.role === 'coordinator') {
      throw new ForbiddenException('Coordinators cannot modify grades');
    }

    const grade = await this.gradesRepository.findOne({
      where: { gradeId: id.toString() },
      relations: { term: true, course: true },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    if (currentUser.role === 'teacher') {
      const canModify = await this.access.isTeacherOfCourse(
        currentUser.userId,
        Number(grade.courseId),
      );
      if (!canModify) {
        throw new ForbiddenException(
          'You are not allowed to modify grades for this course',
        );
      }
    }

    if (dto.mark !== undefined) {
      grade.mark = dto.mark;
    }

    if (dto.comment !== undefined) {
      grade.comment = dto.comment ?? null;
    }

    const course = await this.coursesRepository.findOne({
      where: { courseId: grade.courseId },
      relations: { courseInstance: true },
    });

    if (!course || !course.courseInstance?.schoolYearId) {
      throw new ConflictException('Course schedule is incomplete');
    }

    const schoolYearId = Number(course.courseInstance.schoolYearId);
    if (!Number.isFinite(schoolYearId)) {
      throw new ConflictException('Course schedule is incomplete');
    }

    await this.assertYearWritable(schoolYearId, currentUser);

    try {
      const saved = await this.gradesRepository.save(grade);
      return this.toResponse(saved);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A grade for this student, course, and term already exists',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const grade = await this.gradesRepository.findOne({
      where: { gradeId: id.toString() },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found');
    }

    await this.gradesRepository.remove(grade);
    return { deleted: true };
  }

  private toResponse(grade: Grades): GradeResponse {
    return {
      gradeId: Number(grade.gradeId),
      studentId: Number(grade.studentId),
      courseId: Number(grade.courseId),
      termId: Number(grade.termId),
      schoolYearId: grade.term?.schoolYearId
        ? Number(grade.term.schoolYearId)
        : null,
      mark: this.toLetterMark(Number(grade.mark)),
      comment: grade.comment ?? null,
    };
  }

  static calculateFinalLetterMark(termMarks: number[]): LetterMark {
    if (termMarks.length === 0) {
      throw new Error('At least one term mark is required');
    }
    const mean =
      termMarks.reduce((acc, mark) => acc + mark, 0) / termMarks.length;
    const rounded = Math.round(mean);
    const normalized = GradesService.normalizeNumericMark(rounded);
    return NUMERIC_TO_LETTER[normalized];
  }

  private toLetterMark(mark: number): LetterMark {
    const normalized = GradesService.normalizeNumericMark(Number(mark));
    return NUMERIC_TO_LETTER[normalized];
  }

  private async assertYearWritable(
    schoolYearId: number,
    user: { role: string },
  ): Promise<void> {
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

  private static normalizeNumericMark(value: number): NumericMark {
    if (NUMERIC_MARK_DOMAIN.includes(value as NumericMark)) {
      return value as NumericMark;
    }

    return NUMERIC_MARK_DOMAIN.reduce((closest, candidate) => {
      const candidateDiff = Math.abs(candidate - value);
      const closestDiff = Math.abs(closest - value);
      if (candidateDiff < closestDiff) {
        return candidate;
      }
      if (candidateDiff === closestDiff && candidate > closest) {
        return candidate;
      }
      return closest;
    }, NUMERIC_MARK_DOMAIN[NUMERIC_MARK_DOMAIN.length - 1]);
  }
}
