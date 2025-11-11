import { BadRequestException, ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CourseInstancesService } from './course_instances.service';
import { CourseInstancesRepository } from './course_instances.repository';
import { SubjectsRepository } from '../subjects/subjects.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { CreateCourseInstanceDto } from './dto/create-course-instance.dto';

type Mocked<T> = Partial<Record<keyof T, jest.Mock>>;

describe('CourseInstancesService', () => {
  let service: CourseInstancesService;
  let repository: CourseInstancesRepository & Mocked<CourseInstancesRepository>;
  let subjectsRepository: SubjectsRepository & Mocked<SubjectsRepository>;
  let schoolYearsRepository: SchoolYearsRepository &
    Mocked<SchoolYearsRepository>;

  const subject = {
    subjectId: '1',
    subjectCode: 'MATH',
    name: 'Mathematics',
    area: { code: 'SCI' },
  };

  const schoolYear = {
    schoolYearId: '10',
    name: '2025',
    yearStart: '2025-01-01',
    yearEnd: '2025-12-31',
  };

  const createDto: CreateCourseInstanceDto = {
    subjectId: 1,
    gradeLevel: 5,
    schoolYearId: 10,
    courseName: 'Mathematics Grade 5',
    weeklyHours: 4,
  };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    } as unknown as CourseInstancesRepository &
      Mocked<CourseInstancesRepository>;

    subjectsRepository = {
      findOne: jest.fn(),
    } as unknown as SubjectsRepository & Mocked<SubjectsRepository>;

    schoolYearsRepository = {
      findOne: jest.fn(),
    } as unknown as SchoolYearsRepository & Mocked<SchoolYearsRepository>;

    service = new CourseInstancesService(
      repository,
      subjectsRepository,
      schoolYearsRepository,
    );

    (subjectsRepository.findOne as jest.Mock).mockResolvedValue(subject);
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue(schoolYear);
  });

  it('throws ConflictException when composite keys already exist', async () => {
    (repository.create as jest.Mock).mockImplementation((payload) => payload);
    (repository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' }),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws BadRequestException when grade level is out of range', async () => {
    await expect(
      service.create({
        ...createDto,
        gradeLevel: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('derives course code when none is provided', async () => {
    const expectedCode = 'MATH-5-Y2025';
    const createdEntity = {
      ...createDto,
      courseCode: expectedCode,
      subjectId: subject.subjectId,
      schoolYearId: schoolYear.schoolYearId,
      gradeLevel: createDto.gradeLevel,
      weeklyHours: createDto.weeklyHours,
      isActive: true,
      courseInstanceId: '7',
    };

    (repository.create as jest.Mock).mockImplementation((payload) => ({
      ...payload,
      courseInstanceId: undefined,
    }));
    (repository.save as jest.Mock).mockResolvedValue({ courseInstanceId: '7' });
    (repository.findOne as jest.Mock).mockResolvedValue({
      ...createdEntity,
      subject,
      schoolYear,
    });

    const result = await service.create(createDto);

    expect(repository.create as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ courseCode: expectedCode }),
    );
    expect(result.courseCode).toBe(expectedCode);
    expect(result.subjectCode).toBe(subject.subjectCode);
    expect(result.schoolYearName).toBe(schoolYear.name);
  });
});
