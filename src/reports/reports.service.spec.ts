import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { StudentsRepository } from '../students/students.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { GradesRepository } from '../grades/grades.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { AccessService } from '../auth/access.service';
import { PrintIdService } from './print-id.service';
import { PlanillaSheetsRepository } from '../planillas/planillas.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';

describe('ReportsService', () => {
  let service: ReportsService;
  let studentsRepository: jest.Mocked<StudentsRepository>;
  let schoolYearsRepository: jest.Mocked<SchoolYearsRepository>;
  let gradesRepository: jest.Mocked<GradesRepository>;
  let coursesRepository: jest.Mocked<CoursesRepository>;
  let accessService: jest.Mocked<AccessService>;
  let printIdService: jest.Mocked<PrintIdService>;
  let planillaSheetsRepository: jest.Mocked<PlanillaSheetsRepository>;
  let enrollmentsRepository: jest.Mocked<EnrollmentsRepository>;
  let classGroupsRepository: jest.Mocked<ClassGroupsRepository>;

  beforeEach(() => {
    studentsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<StudentsRepository>;

    schoolYearsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<SchoolYearsRepository>;

    gradesRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<GradesRepository>;

    coursesRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<CoursesRepository>;

    accessService = {
      isTeacherOfCourse: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<AccessService>;

    printIdService = {
      nextId: jest.fn().mockResolvedValue(9001),
    } as unknown as jest.Mocked<PrintIdService>;

    planillaSheetsRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<PlanillaSheetsRepository>;

    enrollmentsRepository = {
      find: jest.fn(),
    } as unknown as jest.Mocked<EnrollmentsRepository>;

    classGroupsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ClassGroupsRepository>;

    service = new ReportsService(
      studentsRepository,
      schoolYearsRepository,
      gradesRepository,
      coursesRepository,
      accessService,
      printIdService,
      planillaSheetsRepository,
      enrollmentsRepository,
      classGroupsRepository,
    );
  });

  describe('getStudentRecordReport', () => {
    it('returns selected periods and subject marks from planillas', async () => {
      studentsRepository.findOne.mockResolvedValue({
        studentId: '15',
        nationalId: '100349335',
        firstName: 'Ana',
        lastName: 'Rios',
      } as any);

      schoolYearsRepository.findOne.mockResolvedValue({
        schoolYearId: '3',
        name: '2026',
      } as any);

      enrollmentsRepository.find.mockResolvedValue([
        {
          studentId: '15',
          schoolYearId: '3',
          gradeLevel: 10,
          classGroupId: '21',
          active: true,
          classGroup: {
            gradeLevel: 10,
            section: '01',
          },
        },
      ] as any);

      planillaSheetsRepository.find.mockResolvedValue([
        {
          planillaSheetId: '55',
          groupCode: '1001',
          title: 'Planilla 1001',
          metadata: {
            subjectName: 'Matematicas',
            teacherName: 'Profe Uno',
          },
          rows: [
            {
              studentId: 15,
              nationalId: '100349335',
              cells: {
                proc_1: 'A',
                cog_1: 'S',
                act_1: 'B',
                proc_2: 'S',
                cog_2: 'A',
                act_2: 'A',
                proc_3: '',
                cog_3: '',
                act_3: '',
              },
            },
          ],
        },
      ] as any);

      const result = await service.getStudentRecordReport({
        studentId: 15,
        schoolYearId: 3,
        periods: '1,2',
      });

      expect(result.printId).toBe(9001);
      expect(result.student.fullName).toBe('Ana Rios');
      expect(result.student.groupCode).toBe('1001');
      expect(result.periods).toEqual([1, 2]);
      expect(result.subjects).toHaveLength(1);
      expect(result.subjects[0].subjectName).toBe('Matematicas');
      expect(result.subjects[0].periods).toEqual([
        {
          period: 1,
          procedural: 'A',
          cognitive: 'S',
          attitudinal: 'B',
          complete: true,
          passing: true,
        },
        {
          period: 2,
          procedural: 'S',
          cognitive: 'A',
          attitudinal: 'A',
          complete: true,
          passing: true,
        },
      ]);
      expect(result.allSelectedPeriodsComplete).toBe(true);
    });

    it('rejects invalid period selections', async () => {
      await expect(
        service.getStudentRecordReport({
          studentId: 15,
          schoolYearId: 3,
          periods: '9',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('fails when no planilla rows exist for the student', async () => {
      studentsRepository.findOne.mockResolvedValue({
        studentId: '15',
        nationalId: '100349335',
        firstName: 'Ana',
        lastName: 'Rios',
      } as any);

      schoolYearsRepository.findOne.mockResolvedValue({
        schoolYearId: '3',
        name: '2026',
      } as any);

      enrollmentsRepository.find.mockResolvedValue([
        {
          studentId: '15',
          schoolYearId: '3',
          gradeLevel: 10,
          classGroupId: '21',
          active: true,
          classGroup: {
            gradeLevel: 10,
            section: '01',
          },
        },
      ] as any);

      planillaSheetsRepository.find.mockResolvedValue([]);

      await expect(
        service.getStudentRecordReport({
          studentId: 15,
          schoolYearId: 3,
          periods: 'all',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getEligibilityReport', () => {
    it('marks only complete non-failing students as eligible for graduation', async () => {
      schoolYearsRepository.findOne.mockResolvedValue({
        schoolYearId: '3',
        name: '2026',
      } as any);

      enrollmentsRepository.find.mockResolvedValue([
        {
          studentId: '15',
          gradeLevel: 11,
          classGroupId: '21',
          student: {
            nationalId: '100349335',
            firstName: 'Ana',
            lastName: 'Rios',
          },
          classGroup: {
            gradeLevel: 11,
            section: '01',
          },
        },
        {
          studentId: '16',
          gradeLevel: 11,
          classGroupId: '21',
          student: {
            nationalId: '100349336',
            firstName: 'Luis',
            lastName: 'Mora',
          },
          classGroup: {
            gradeLevel: 11,
            section: '01',
          },
        },
      ] as any);

      planillaSheetsRepository.find.mockResolvedValue([
        {
          planillaSheetId: '55',
          classGroupId: '21',
          gradeLevel: 11,
          groupCode: '1101',
          title: 'Planilla 1101',
          metadata: { subjectName: 'Matematicas' },
          rows: [
            {
              studentId: 15,
              nationalId: '100349335',
              cells: {
                proc_1: 'A',
                cog_1: 'A',
                act_1: 'A',
                proc_2: 'A',
                cog_2: 'A',
                act_2: 'A',
                proc_3: 'B',
                cog_3: 'A',
                act_3: 'A',
                proc_4: 'S',
                cog_4: 'A',
                act_4: 'B',
              },
            },
            {
              studentId: 16,
              nationalId: '100349336',
              cells: {
                proc_1: 'A',
                cog_1: 'J',
                act_1: 'A',
                proc_2: 'A',
                cog_2: 'A',
                act_2: 'A',
                proc_3: 'A',
                cog_3: 'A',
                act_3: 'A',
                proc_4: 'A',
                cog_4: 'A',
                act_4: 'A',
              },
            },
          ],
        },
      ] as any);

      const result = await service.getEligibilityReport({
        schoolYearId: 3,
        gradeLevel: 11,
      });

      expect(result.documentType).toBe('graduation');
      expect(result.eligibleCount).toBe(1);
      expect(result.totalStudents).toBe(2);
      expect(result.statement).toContain('1 student has finished their studies.');
      expect(result.students).toEqual([
        {
          studentId: 15,
          nationalId: '100349335',
          fullName: 'Ana Rios',
          groupCode: '1101',
          eligible: true,
          missingSubjects: [],
          missingGrades: [],
          failingSubjects: [],
        },
        {
          studentId: 16,
          nationalId: '100349336',
          fullName: 'Luis Mora',
          groupCode: '1101',
          eligible: false,
          missingSubjects: [],
          missingGrades: [],
          failingSubjects: ['Matematicas'],
        },
      ]);
    });

    it('flags missing grades as non-eligible for promotion', async () => {
      schoolYearsRepository.findOne.mockResolvedValue({
        schoolYearId: '3',
        name: '2026',
      } as any);

      enrollmentsRepository.find.mockResolvedValue([
        {
          studentId: '15',
          gradeLevel: 10,
          classGroupId: '21',
          student: {
            nationalId: '100349335',
            firstName: 'Ana',
            lastName: 'Rios',
          },
          classGroup: {
            gradeLevel: 10,
            section: '01',
          },
        },
      ] as any);

      planillaSheetsRepository.find.mockResolvedValue([
        {
          planillaSheetId: '55',
          classGroupId: '21',
          gradeLevel: 10,
          groupCode: '1001',
          title: 'Planilla 1001',
          metadata: { subjectName: 'Historia' },
          rows: [
            {
              studentId: 15,
              nationalId: '100349335',
              cells: {
                proc_1: 'A',
                cog_1: 'A',
                act_1: 'A',
                proc_2: '',
                cog_2: 'A',
                act_2: 'A',
                proc_3: 'A',
                cog_3: 'A',
                act_3: 'A',
                proc_4: 'A',
                cog_4: 'A',
                act_4: 'A',
              },
            },
          ],
        },
      ] as any);

      const result = await service.getEligibilityReport({
        schoolYearId: 3,
        gradeLevel: 10,
      });

      expect(result.documentType).toBe('promotion');
      expect(result.eligibleCount).toBe(0);
      expect(result.statement).toContain('grade 11');
      expect(result.students[0].eligible).toBe(false);
      expect(result.students[0].missingGrades).toContain('Historia · P2 PROC');
    });
  });
});
