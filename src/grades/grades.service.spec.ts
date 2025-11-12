import {
  BadRequestException,
  ConflictException,
  ValidationPipe,
  ArgumentMetadata,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { GradesService } from './grades.service';
import { GradesRepository } from './grades.repository';
import { StudentsRepository } from '../students/students.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { TermsRepository } from '../terms/terms.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { CreateGradeDto } from './dto/create-grade.dto';
import { AccessService } from '../auth/access.service';
import { SchoolYearsRepository } from '../school_years/school_years.repository';

type Mocked<T> = Partial<Record<keyof T, jest.Mock>>;

const createDriverError = (
  overrides: Partial<{ code?: string; constraint?: string }>,
) => Object.assign(new Error(), overrides);

describe('GradesService', () => {
  let service: GradesService;
  let gradesRepository: GradesRepository & Mocked<GradesRepository>;
  let studentsRepository: StudentsRepository & Mocked<StudentsRepository>;
  let coursesRepository: CoursesRepository & Mocked<CoursesRepository>;
  let termsRepository: TermsRepository & Mocked<TermsRepository>;
  let enrollmentsRepository: EnrollmentsRepository &
    Mocked<EnrollmentsRepository>;
  let schoolYearsRepository: SchoolYearsRepository &
    Mocked<SchoolYearsRepository>;
  let accessService: {
    courseIdsForTeacher: jest.Mock<Promise<number[]>, [number]>;
    isTeacherOfCourse: jest.Mock<Promise<boolean>, [number, number]>;
  };

  const createDto: CreateGradeDto = {
    studentId: 1,
    courseId: 10,
    termId: 3,
    mark: 5,
  };

  beforeEach(() => {
    gradesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      merge: jest.fn(),
    } as unknown as GradesRepository & Mocked<GradesRepository>;

    studentsRepository = {
      findOne: jest.fn(),
    } as unknown as StudentsRepository & Mocked<StudentsRepository>;

    coursesRepository = {
      findOne: jest.fn(),
    } as unknown as CoursesRepository & Mocked<CoursesRepository>;

    termsRepository = {
      findOne: jest.fn(),
    } as unknown as TermsRepository & Mocked<TermsRepository>;

    enrollmentsRepository = {
      findOne: jest.fn(),
    } as unknown as EnrollmentsRepository & Mocked<EnrollmentsRepository>;

    schoolYearsRepository = {
      findOne: jest.fn(),
    } as unknown as SchoolYearsRepository & Mocked<SchoolYearsRepository>;

    accessService = {
      courseIdsForTeacher: jest.fn().mockResolvedValue([]),
      isTeacherOfCourse: jest.fn().mockResolvedValue(true),
    };

    (studentsRepository.findOne as jest.Mock).mockResolvedValue({
      studentId: '1',
    });
    (coursesRepository.findOne as jest.Mock).mockResolvedValue({
      courseId: '10',
      classGroup: { classGroupId: '20' },
      courseInstance: { schoolYearId: '99' },
    });
    (termsRepository.findOne as jest.Mock).mockResolvedValue({
      termId: '3',
      schoolYearId: '99',
    });
    (enrollmentsRepository.findOne as jest.Mock).mockResolvedValue({
      enrollmentId: '55',
    });
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '99',
      isActive: true,
    });

    service = new GradesService(
      gradesRepository,
      studentsRepository,
      coursesRepository,
      termsRepository,
      enrollmentsRepository,
      schoolYearsRepository,
      accessService as unknown as AccessService,
    );
  });

  it('throws ConflictException when student is not actively enrolled', async () => {
    (enrollmentsRepository.findOne as jest.Mock).mockResolvedValueOnce(null);

    await expect(
      service.create(createDto, { userId: 1, role: 'admin' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when duplicate grade exists', async () => {
    (gradesRepository.create as jest.Mock).mockReturnValue({});
    (gradesRepository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], createDriverError({ code: '23505' })),
    );

    await expect(
      service.create(createDto, { userId: 1, role: 'admin' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when duplicate grade exists on update', async () => {
    const existingGrade = {
      gradeId: '1',
      studentId: '1',
      courseId: '10',
      termId: '3',
      term: { schoolYearId: '99' },
      course: { courseId: '10' },
      mark: 5,
      comment: null,
    };

    (gradesRepository.findOne as jest.Mock).mockResolvedValue(existingGrade);
    (coursesRepository.findOne as jest.Mock).mockResolvedValue({
      courseId: '10',
      courseInstance: { schoolYearId: '99' },
    });
    (gradesRepository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], createDriverError({ code: '23505' })),
    );

    await expect(
      service.update(1, { comment: 'Great job' }, { userId: 1, role: 'admin' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid mark via validation pipe', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });

    const metadata: ArgumentMetadata = {
      type: 'body',
      metatype: CreateGradeDto,
    };

    await expect(
      pipe.transform(
        {
          studentId: 1,
          courseId: 10,
          termId: 3,
          mark: 2,
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('calculateFinalLetterMark', () => {
    it('maps [5,4,3,1] -> mean 3.25 -> rounds to 3 -> B', () => {
      expect(GradesService.calculateFinalLetterMark([5, 4, 3, 1])).toBe('B');
    });

    it('maps [1,1,1,1] -> J (fail)', () => {
      expect(GradesService.calculateFinalLetterMark([1, 1, 1, 1])).toBe('J');
    });
  });
});
