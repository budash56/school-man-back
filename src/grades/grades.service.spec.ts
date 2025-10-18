import { BadRequestException, ConflictException, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common/interfaces/features/arguments.interface';
import { QueryFailedError } from 'typeorm';
import { GradesService } from './grades.service';
import { GradesRepository } from './grades.repository';
import { StudentsRepository } from '../students/students.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { TermsRepository } from '../terms/terms.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { CreateGradeDto } from './dto/create-grade.dto';

type Mocked<T> = Partial<Record<keyof T, jest.Mock>>;

describe('GradesService', () => {
  let service: GradesService;
  let gradesRepository: GradesRepository & Mocked<GradesRepository>;
  let studentsRepository: StudentsRepository & Mocked<StudentsRepository>;
  let coursesRepository: CoursesRepository & Mocked<CoursesRepository>;
  let termsRepository: TermsRepository & Mocked<TermsRepository>;
  let enrollmentsRepository: EnrollmentsRepository & Mocked<EnrollmentsRepository>;

  const createDto: CreateGradeDto = {
    studentId: 1,
    courseId: 10,
    termId: 3,
    mark: 'S',
  };

  beforeEach(() => {
    gradesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
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

    (studentsRepository.findOne as jest.Mock).mockResolvedValue({ studentId: '1' });
    (coursesRepository.findOne as jest.Mock).mockResolvedValue({
      courseId: '10',
      classGroup: { classGroupId: '20' },
      courseInstance: { schoolYearId: '99' },
    });
    (termsRepository.findOne as jest.Mock).mockResolvedValue({
      termId: '3',
      schoolYearId: '99',
    });
    (enrollmentsRepository.findOne as jest.Mock).mockResolvedValue({ enrollmentId: '55' });

    service = new GradesService(
      gradesRepository,
      studentsRepository,
      coursesRepository,
      termsRepository,
      enrollmentsRepository,
    );
  });

  it('throws ConflictException when student is not actively enrolled', async () => {
    (enrollmentsRepository.findOne as jest.Mock).mockResolvedValueOnce(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when duplicate grade exists', async () => {
    (gradesRepository.create as jest.Mock).mockReturnValue({});
    (gradesRepository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' }),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
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
          mark: 'X',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
