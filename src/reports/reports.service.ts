import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StudentsRepository } from '../students/students.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { GradesRepository } from '../grades/grades.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { AccessService } from '../auth/access.service';
import { PrintIdService } from './print-id.service';
import { ActiveStudentCertificateDto } from './dto/active-student-certificate.dto';
import { TermGradeReportDto } from './dto/term-grade-report.dto';
import { FinalGradeReportDto } from './dto/final-grade-report.dto';
import { GradesService } from '../grades/grades.service';
import type { SanitizedUser } from '../auth/auth.types';

type ActingUser = Pick<SanitizedUser, 'role'> & { userId?: number };

@Injectable()
export class ReportsService {
  constructor(
    private readonly studentsRepository: StudentsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly gradesRepository: GradesRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly accessService: AccessService,
    private readonly printIdService: PrintIdService,
  ) {}

  async generateActiveStudentCertificate(
    dto: ActiveStudentCertificateDto,
  ): Promise<{
    printId: number;
    student: { studentId: number; fullName: string };
    schoolYear: { schoolYearId: number; name: string };
    todos: string[];
  }> {
    const [student, schoolYear] = await Promise.all([
      this.studentsRepository.findOne({
        where: { studentId: dto.studentId.toString() },
      }),
      this.schoolYearsRepository.findOne({
        where: { schoolYearId: dto.schoolYearId.toString() },
      }),
    ]);

    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    const printId = await this.printIdService.nextId();
    return {
      printId,
      student: {
        studentId: Number(student.studentId),
        fullName: `${student.firstName} ${student.lastName}`,
      },
      schoolYear: {
        schoolYearId: Number(schoolYear.schoolYearId),
        name: schoolYear.name,
      },
      todos: ['Add official certificate body', 'Add signature blocks'],
    };
  }

  async getTermGradeReport(
    dto: TermGradeReportDto,
    user: ActingUser,
  ): Promise<{
    printId: number;
    grade: {
      studentId: number;
      courseId: number;
      termId: number;
      numericMark: number;
      letterMark: string;
      comment: string | null;
    };
  }> {
    const grade = await this.gradesRepository.findOne({
      where: {
        studentId: dto.studentId.toString(),
        courseId: dto.courseId.toString(),
        termId: dto.termId.toString(),
      },
      relations: { term: true, course: true },
    });

    if (!grade) {
      throw new NotFoundException('Grade not found for the provided filters');
    }

    await this.assertTeacherAccess(Number(grade.courseId), user);

    const printId = await this.printIdService.nextId();
    const numericMark = Number(grade.mark);
    return {
      printId,
      grade: {
        studentId: Number(grade.studentId),
        courseId: Number(grade.courseId),
        termId: Number(grade.termId),
        numericMark,
        letterMark: this.numericToLetterMark(numericMark),
        comment: grade.comment ?? null,
      },
    };
  }

  async getFinalGradeReport(
    dto: FinalGradeReportDto,
    user: ActingUser,
  ): Promise<{
    printId: number;
    summary: {
      studentId: number;
      courseId: number;
      schoolYearId: number;
      termMarks: number[];
      finalLetter: string;
    };
  }> {
    const course = await this.coursesRepository.findOne({
      where: { courseId: dto.courseId.toString() },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.assertTeacherAccess(Number(course.courseId), user);

    const qb = this.gradesRepository
      .createQueryBuilder('grade')
      .innerJoin('grade.term', 'term')
      .where('grade.studentId = :studentId', {
        studentId: dto.studentId.toString(),
      })
      .andWhere('grade.courseId = :courseId', {
        courseId: dto.courseId.toString(),
      })
      .andWhere('term.schoolYearId = :schoolYearId', {
        schoolYearId: dto.schoolYearId.toString(),
      })
      .orderBy('term.sortOrder', 'ASC')
      .addOrderBy('grade.termId', 'ASC');

    const grades = await qb.getMany();
    if (grades.length === 0) {
      throw new NotFoundException('No term grades found for the specified year');
    }

    const termMarks = grades.map((grade) => Number(grade.mark));
    const finalLetter = GradesService.calculateFinalLetterMark(termMarks);

    const printId = await this.printIdService.nextId();
    return {
      printId,
      summary: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        schoolYearId: dto.schoolYearId,
        termMarks,
        finalLetter,
      },
    };
  }

  private async assertTeacherAccess(
    courseId: number,
    user: ActingUser,
  ): Promise<void> {
    if (user.role !== 'teacher') {
      return;
    }

    const canAccess = await this.accessService.isTeacherOfCourse(
      user.userId ?? 0,
      courseId,
    );

    if (!canAccess) {
      throw new ForbiddenException(
        'You are not allowed to access this course report',
      );
    }
  }

  private numericToLetterMark(value: number): string {
    const normalized = ReportsService.normalizeNumericMark(value);
    switch (normalized) {
      case 5:
        return 'S';
      case 4:
        return 'A';
      case 3:
        return 'B';
      default:
        return 'J';
    }
  }

  private static normalizeNumericMark(value: number): number {
    const allowed = [5, 4, 3, 1];
    if (allowed.includes(value)) {
      return value;
    }
    return allowed.reduce((closest, candidate) => {
      const diff = Math.abs(candidate - value);
      const closestDiff = Math.abs(closest - value);
      if (diff < closestDiff) {
        return candidate;
      }
      if (diff === closestDiff && candidate > closest) {
        return candidate;
      }
      return closest;
    }, 1);
  }
}
