import {
  BadRequestException,
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
import { PlanillaSheetsRepository } from '../planillas/planillas.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { StudentRecordReportDto } from './dto/student-record-report.dto';
import { EligibilityReportDto } from './dto/eligibility-report.dto';

export type ActingUser = Pick<SanitizedUser, 'role'> & { userId?: number };

const REPORT_PERIODS = [1, 2, 3, 4] as const;
type ReportPeriod = (typeof REPORT_PERIODS)[number];
const PLANILLA_GRADE_COMPONENTS = ['proc', 'cog', 'act'] as const;
type PlanillaGradeComponent = (typeof PLANILLA_GRADE_COMPONENTS)[number];

type StoredPlanillaRow = {
  studentId?: number | string | null;
  nationalId?: string | null;
  studentName?: string;
  cells?: Record<string, unknown>;
};

type SubjectPeriodMarks = {
  period: ReportPeriod;
  procedural: string;
  cognitive: string;
  attitudinal: string;
  complete: boolean;
  passing: boolean;
};

type EligibilityStudentResult = {
  studentId: number;
  nationalId: string;
  fullName: string;
  groupCode: string | null;
  eligible: boolean;
  missingSubjects: string[];
  missingGrades: string[];
  failingSubjects: string[];
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly studentsRepository: StudentsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly gradesRepository: GradesRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly accessService: AccessService,
    private readonly printIdService: PrintIdService,
    private readonly planillaSheetsRepository: PlanillaSheetsRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly classGroupsRepository: ClassGroupsRepository,
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

  async getStudentRecordReport(
    dto: StudentRecordReportDto,
  ): Promise<{
    printId: number;
    schoolYear: { schoolYearId: number; name: string };
    student: {
      studentId: number;
      nationalId: string;
      fullName: string;
      gradeLevel: number | null;
      groupCode: string | null;
    };
    periods: ReportPeriod[];
    subjects: Array<{
      planillaSheetId: number;
      subjectName: string;
      teacherName: string | null;
      groupCode: string;
      periods: SubjectPeriodMarks[];
      complete: boolean;
      passing: boolean;
    }>;
    allSelectedPeriodsComplete: boolean;
  }> {
    const studentId = Number(dto.studentId);
    const schoolYearId = Number(dto.schoolYearId);
    const periods = this.parseRequestedPeriods(dto.periods);

    const [student, schoolYear, enrollments] = await Promise.all([
      this.studentsRepository.findOne({
        where: { studentId: studentId.toString() },
      }),
      this.schoolYearsRepository.findOne({
        where: { schoolYearId: schoolYearId.toString() },
      }),
      this.enrollmentsRepository.find({
        where: {
          studentId: studentId.toString(),
          schoolYearId: schoolYearId.toString(),
        },
        relations: { classGroup: true },
        order: { active: 'DESC', enrolledAt: 'DESC' },
      }),
    ]);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    const activeEnrollment = enrollments.find((item) => item.active) ?? enrollments[0] ?? null;
    const planillaWhere = activeEnrollment?.classGroupId
      ? {
          schoolYearId: schoolYearId.toString(),
          classGroupId: activeEnrollment.classGroupId.toString(),
        }
      : activeEnrollment
        ? {
            schoolYearId: schoolYearId.toString(),
            gradeLevel: activeEnrollment.gradeLevel,
          }
        : {
            schoolYearId: schoolYearId.toString(),
          };

    const planillas = await this.planillaSheetsRepository.find({
      where: planillaWhere,
      order: { groupCode: 'ASC', title: 'ASC' },
    });

    const subjects = planillas
      .map((planilla) => {
        const row = this.findStudentPlanillaRow(
          planilla.rows,
          studentId,
          student.nationalId,
        );

        if (!row) {
          return null;
        }

        const periodMarks = periods.map((period) => {
          const procedural = this.getPlanillaMark(row, 'proc', period);
          const cognitive = this.getPlanillaMark(row, 'cog', period);
          const attitudinal = this.getPlanillaMark(row, 'act', period);
          const values = [procedural, cognitive, attitudinal];
          const complete = values.every(Boolean);
          const passing = values.every((value) => this.isPassingPlanillaMark(value));

          return {
            period,
            procedural,
            cognitive,
            attitudinal,
            complete,
            passing,
          };
        });

        return {
          planillaSheetId: Number(planilla.planillaSheetId),
          subjectName:
            this.readMetadataString(planilla.metadata, 'subjectName') ?? planilla.title,
          teacherName: this.readMetadataString(planilla.metadata, 'teacherName'),
          groupCode: planilla.groupCode,
          periods: periodMarks,
          complete: periodMarks.every((entry) => entry.complete),
          passing: periodMarks.every((entry) => entry.passing),
        };
      })
      .filter(
        (
          subject,
        ): subject is {
          planillaSheetId: number;
          subjectName: string;
          teacherName: string | null;
          groupCode: string;
          periods: SubjectPeriodMarks[];
          complete: boolean;
          passing: boolean;
        } => subject !== null,
      )
      .sort((left, right) =>
        left.subjectName.localeCompare(right.subjectName, 'es', {
          sensitivity: 'base',
        }),
      );

    if (subjects.length === 0) {
      throw new NotFoundException(
        'No planilla grades were found for the selected student and school year',
      );
    }

    const printId = await this.printIdService.nextId();

    return {
      printId,
      schoolYear: {
        schoolYearId: Number(schoolYear.schoolYearId),
        name: schoolYear.name,
      },
      student: {
        studentId: Number(student.studentId),
        nationalId: student.nationalId,
        fullName: `${student.firstName} ${student.lastName}`,
        gradeLevel: activeEnrollment?.gradeLevel ?? null,
        groupCode: activeEnrollment?.classGroup
          ? `${activeEnrollment.classGroup.gradeLevel}${activeEnrollment.classGroup.section}`
          : subjects[0]?.groupCode ?? null,
      },
      periods,
      subjects,
      allSelectedPeriodsComplete: subjects.every((subject) => subject.complete),
    };
  }

  async getEligibilityReport(
    dto: EligibilityReportDto,
  ): Promise<{
    printId: number;
    schoolYear: { schoolYearId: number; name: string };
    gradeLevel: number;
    classGroup: { classGroupId: number; groupCode: string } | null;
    documentType: 'promotion' | 'graduation';
    statement: string;
    eligibleCount: number;
    totalStudents: number;
    students: EligibilityStudentResult[];
  }> {
    const schoolYearId = Number(dto.schoolYearId);
    const gradeLevel = Number(dto.gradeLevel);
    const classGroupId =
      dto.classGroupId !== undefined ? Number(dto.classGroupId) : undefined;

    const [schoolYear, classGroup, enrollments, planillas] = await Promise.all([
      this.schoolYearsRepository.findOne({
        where: { schoolYearId: schoolYearId.toString() },
      }),
      classGroupId
        ? this.classGroupsRepository.findOne({
            where: { classGroupId: classGroupId.toString() },
          })
        : Promise.resolve(null),
      this.enrollmentsRepository.find({
        where: {
          schoolYearId: schoolYearId.toString(),
          gradeLevel,
          ...(classGroupId
            ? { classGroupId: classGroupId.toString() }
            : {}),
          active: true,
        },
        relations: { student: true, classGroup: true },
        order: { gradeLevel: 'ASC', enrolledAt: 'ASC' },
      }),
      this.planillaSheetsRepository.find({
        where: {
          schoolYearId: schoolYearId.toString(),
          gradeLevel,
          ...(classGroupId
            ? { classGroupId: classGroupId.toString() }
            : {}),
        },
        order: { groupCode: 'ASC', title: 'ASC' },
      }),
    ]);

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    if (classGroupId && !classGroup) {
      throw new NotFoundException('Class group not found');
    }

    if (enrollments.length === 0) {
      throw new NotFoundException('No active students found for the selected filters');
    }

    if (planillas.length === 0) {
      throw new NotFoundException('No planilla grades found for the selected filters');
    }

    const planillasByClassGroupId = new Map<string, typeof planillas>();
    planillas.forEach((planilla) => {
      const key = planilla.classGroupId ?? `grade-${planilla.gradeLevel}`;
      const current = planillasByClassGroupId.get(key) ?? [];
      current.push(planilla);
      planillasByClassGroupId.set(key, current);
    });

    const students = enrollments.map((enrollment) => {
      const matchingPlanillas =
        (enrollment.classGroupId
          ? planillasByClassGroupId.get(enrollment.classGroupId)
          : undefined) ??
        planillasByClassGroupId.get(`grade-${enrollment.gradeLevel}`) ??
        [];

      const missingSubjects: string[] = [];
      const missingGrades: string[] = [];
      const failingSubjects = new Set<string>();

      if (matchingPlanillas.length === 0) {
        missingSubjects.push('Sin planillas registradas para el grupo');
      }

      matchingPlanillas.forEach((planilla) => {
        const subjectName =
          this.readMetadataString(planilla.metadata, 'subjectName') ?? planilla.title;
        const row = this.findStudentPlanillaRow(
          planilla.rows,
          Number(enrollment.studentId),
          enrollment.student.nationalId,
        );

        if (!row) {
          missingSubjects.push(subjectName);
          return;
        }

        REPORT_PERIODS.forEach((period) => {
          PLANILLA_GRADE_COMPONENTS.forEach((component) => {
            const value = this.getPlanillaMark(row, component, period);
            if (!value) {
              missingGrades.push(`${subjectName} · P${period} ${component.toUpperCase()}`);
              return;
            }
            if (!this.isPassingPlanillaMark(value)) {
              failingSubjects.add(subjectName);
            }
          });
        });
      });

      const eligible =
        matchingPlanillas.length > 0 &&
        missingSubjects.length === 0 &&
        missingGrades.length === 0 &&
        failingSubjects.size === 0;

      return {
        studentId: Number(enrollment.studentId),
        nationalId: enrollment.student.nationalId,
        fullName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        groupCode: enrollment.classGroup
          ? `${enrollment.classGroup.gradeLevel}${enrollment.classGroup.section}`
          : null,
        eligible,
        missingSubjects,
        missingGrades,
        failingSubjects: Array.from(failingSubjects).sort((left, right) =>
          left.localeCompare(right, 'es', { sensitivity: 'base' }),
        ),
      };
    });

    const eligibleCount = students.filter((student) => student.eligible).length;
    const documentType = gradeLevel === 11 ? 'graduation' : 'promotion';
    const statement =
      documentType === 'graduation'
        ? `${eligibleCount} ${
            eligibleCount === 1 ? 'student has' : 'students have'
          } finished their studies.`
        : `${eligibleCount} ${
            eligibleCount === 1 ? 'student is' : 'students are'
          } eligible to pass to grade ${gradeLevel + 1}.`;

    const printId = await this.printIdService.nextId();

    return {
      printId,
      schoolYear: {
        schoolYearId: Number(schoolYear.schoolYearId),
        name: schoolYear.name,
      },
      gradeLevel,
      classGroup: classGroup
        ? {
            classGroupId: Number(classGroup.classGroupId),
            groupCode: `${classGroup.gradeLevel}${classGroup.section}`,
          }
        : null,
      documentType,
      statement,
      eligibleCount,
      totalStudents: students.length,
      students: students.sort((left, right) =>
        left.fullName.localeCompare(right.fullName, 'es', {
          sensitivity: 'base',
        }),
      ),
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

  private parseRequestedPeriods(raw: string | undefined): ReportPeriod[] {
    if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'all') {
      return [...REPORT_PERIODS];
    }

    const parsed = Array.from(
      new Set(
        raw
          .split(/[\s,]+/)
          .map((value) => Number(value))
          .filter((value) => REPORT_PERIODS.includes(value as ReportPeriod)),
      ),
    ).sort((left, right) => left - right) as ReportPeriod[];

    if (parsed.length === 0) {
      throw new BadRequestException(
        'At least one valid period must be selected',
      );
    }

    return parsed;
  }

  private findStudentPlanillaRow(
    rows: Array<Record<string, unknown>>,
    studentId: number,
    nationalId: string,
  ): StoredPlanillaRow | null {
    const found = rows.find((entry) => {
      const row = entry as StoredPlanillaRow;
      if (
        row.studentId !== undefined &&
        row.studentId !== null &&
        Number(row.studentId) === studentId
      ) {
        return true;
      }

      return String(row.nationalId ?? '').trim() === nationalId;
    });

    return (found as StoredPlanillaRow | undefined) ?? null;
  }

  private getPlanillaMark(
    row: StoredPlanillaRow,
    component: PlanillaGradeComponent,
    period: ReportPeriod,
  ): string {
    const cells = row.cells ?? {};
    const key = `${component}_${period}`;
    return String(cells[key] ?? '')
      .trim()
      .toUpperCase();
  }

  private isPassingPlanillaMark(value: string): boolean {
    return ['S', 'A', 'B'].includes(value.trim().toUpperCase());
  }

  private readMetadataString(
    metadata: Record<string, unknown> | null | undefined,
    key: string,
  ): string | null {
    const value = metadata?.[key];
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
