import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentsRepository } from './enrollments.repository';
import { StudentsRepository } from '../students/students.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

type MockedEnrollmentsRepository = Partial<
  Record<keyof EnrollmentsRepository, jest.Mock>
>;

type MockedStudentsRepository = Partial<
  Record<keyof StudentsRepository, jest.Mock>
>;

type MockedClassGroupsRepository = Partial<
  Record<keyof ClassGroupsRepository, jest.Mock>
>;

type MockedSchoolYearsRepository = Partial<
  Record<keyof SchoolYearsRepository, jest.Mock>
>;

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let enrollmentsRepository: EnrollmentsRepository &
    MockedEnrollmentsRepository;
  let studentsRepository: StudentsRepository & MockedStudentsRepository;
  let classGroupsRepository: ClassGroupsRepository &
    MockedClassGroupsRepository;
  let schoolYearsRepository: SchoolYearsRepository &
    MockedSchoolYearsRepository;

  const createDto: CreateEnrollmentDto = {
    studentId: 1,
    classGroupId: 2,
    schoolYearId: 10,
  };

  beforeEach(() => {
    enrollmentsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as EnrollmentsRepository & MockedEnrollmentsRepository;

    studentsRepository = {
      findOne: jest.fn(),
    } as unknown as StudentsRepository & MockedStudentsRepository;

    classGroupsRepository = {
      findOne: jest.fn(),
    } as unknown as ClassGroupsRepository & MockedClassGroupsRepository;

    schoolYearsRepository = {
      findOne: jest.fn(),
    } as unknown as SchoolYearsRepository & MockedSchoolYearsRepository;

    (studentsRepository.findOne as jest.Mock).mockResolvedValue({
      studentId: '1',
    });
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue({
      classGroupId: '2',
      schoolYearId: '10',
    });
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '10',
    });

    service = new EnrollmentsService(
      enrollmentsRepository,
      studentsRepository,
      classGroupsRepository,
      schoolYearsRepository,
    );
  });

  it('throws ConflictException when creating a second active enrollment for the same student and school year', async () => {
    (enrollmentsRepository.create as jest.Mock).mockReturnValue({});
    (enrollmentsRepository.save as jest.Mock)
      .mockResolvedValueOnce({
        enrollmentId: '100',
        studentId: '1',
        classGroupId: '2',
        schoolYearId: '10',
        active: true,
        enrolledAt: null,
      })
      .mockRejectedValueOnce(new QueryFailedError('', [], { code: '23505' }));

    (enrollmentsRepository.findOne as jest.Mock).mockResolvedValueOnce({
      enrollmentId: '100',
      studentId: '1',
      classGroupId: '2',
      schoolYearId: '10',
      active: true,
      enrolledAt: null,
      student: {},
      classGroup: {},
      schoolYear: {},
    });

    await service.create(createDto);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('allows creating a new active enrollment after deactivation', async () => {
    (enrollmentsRepository.create as jest.Mock).mockReturnValue({});
    (enrollmentsRepository.save as jest.Mock)
      .mockResolvedValueOnce({
        enrollmentId: '100',
        studentId: '1',
        classGroupId: '2',
        schoolYearId: '10',
        active: true,
        enrolledAt: null,
      })
      .mockResolvedValueOnce({
        enrollmentId: '100',
        studentId: '1',
        classGroupId: '2',
        schoolYearId: '10',
        active: false,
        enrolledAt: null,
      })
      .mockResolvedValueOnce({
        enrollmentId: '101',
        studentId: '1',
        classGroupId: '2',
        schoolYearId: '10',
        active: true,
        enrolledAt: null,
      });

    (enrollmentsRepository.findOne as jest.Mock)
      .mockResolvedValueOnce({
        enrollmentId: '100',
        studentId: '1',
        classGroupId: '2',
        schoolYearId: '10',
        active: true,
        enrolledAt: null,
        student: {},
        classGroup: {},
        schoolYear: {},
      })
      .mockResolvedValueOnce({
        enrollmentId: '100',
        studentId: '1',
        classGroupId: '2',
        schoolYearId: '10',
        active: true,
        enrolledAt: null,
        student: {},
        classGroup: {},
        schoolYear: {},
      })
      .mockResolvedValueOnce({
        enrollmentId: '101',
        studentId: '1',
        classGroupId: '2',
        schoolYearId: '10',
        active: true,
        enrolledAt: null,
        student: {},
        classGroup: {},
        schoolYear: {},
      });

    const initial = await service.create(createDto);
    expect(initial.enrollmentId).toBe(100);

    const deactivated = await service.deactivate(initial.enrollmentId);
    expect(deactivated.active).toBe(false);

    const recreated = await service.create(createDto);
    expect(recreated.enrollmentId).toBe(101);
    expect(recreated.active).toBe(true);
  });
});
