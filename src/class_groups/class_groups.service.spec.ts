import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ClassGroupsService } from './class_groups.service';
import { ClassGroupsRepository } from './class_groups.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { ClassGroupFixedLocationsRepository } from '../class_group_fixed_locations/class_group_fixed_locations.repository';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { QueryClassGroupDto } from './dto/query-class-group.dto';
import { ClassGroups } from './class_groups.entity';
import { Enrollments } from '../enrollments/enrollments.entity';
import { ClassGroupFixedLocations } from '../class_group_fixed_locations/class_group_fixed_locations.entity';

const createDto: CreateClassGroupDto = {
  schoolYearId: 1,
  gradeLevel: 10,
  section: '01',
  defaultClassroomId: 2,
};

const createDriverError = (
  overrides: Partial<{ code?: string; constraint?: string }>,
) => Object.assign(new Error(), overrides);

const mockClassGroup = {
  classGroupId: '5',
  schoolYearId: '1',
  gradeLevel: 10,
  section: '01',
  classroom: { classroomId: '2' },
  createdAt: new Date('2024-01-01'),
};

describe('ClassGroupsService', () => {
  let service: ClassGroupsService;
  let classGroupsRepository: jest.Mocked<ClassGroupsRepository>;
  let schoolYearsRepository: jest.Mocked<SchoolYearsRepository>;
  let classroomsRepository: jest.Mocked<ClassroomsRepository>;
  let enrollmentsRepository: jest.Mocked<EnrollmentsRepository>;
  let fixedLocationsRepository: jest.Mocked<ClassGroupFixedLocationsRepository>;

  beforeEach(() => {
    classGroupsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      merge: jest.fn(),
    } as unknown as jest.Mocked<ClassGroupsRepository>;

    schoolYearsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<SchoolYearsRepository>;

    classroomsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ClassroomsRepository>;

    enrollmentsRepository = {
      find: jest.fn(),
      count: jest.fn(),
      manager: { transaction: jest.fn() },
    } as unknown as jest.Mocked<EnrollmentsRepository>;

    fixedLocationsRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<ClassGroupFixedLocationsRepository>;

    const availabilityQueryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };

    (classGroupsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      availabilityQueryBuilder,
    );

    service = new ClassGroupsService(
      classGroupsRepository,
      schoolYearsRepository,
      classroomsRepository,
      enrollmentsRepository,
      fixedLocationsRepository,
    );
  });

  it('creates a class group successfully', async () => {
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '1',
    });
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({
      classroomId: '2',
      name: 'Room 202',
      capacity: 30,
    });
    (classGroupsRepository.create as jest.Mock).mockReturnValue({});
    (classGroupsRepository.save as jest.Mock).mockResolvedValue({
      classGroupId: '5',
    });
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue(
      mockClassGroup,
    );

    const result = await service.create(createDto);

    expect(result).toEqual({
      classGroupId: 5,
      schoolYearId: 1,
      gradeLevel: 10,
      section: '01',
      code: '1001',
      defaultClassroomId: 2,
      createdAt: mockClassGroup.createdAt,
    });
  });

  it('throws ConflictException on duplicate unique key', async () => {
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '1',
    });
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({
      classroomId: '2',
    });
    (classGroupsRepository.create as jest.Mock).mockReturnValue({});
    (classGroupsRepository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError(
        '',
        [],
        createDriverError({
          code: '23505',
          constraint: 'uniq_cg_year_grade_section',
        }),
      ),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('paginates and sorts findAll', async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockClassGroup], 1]),
    };

    (classGroupsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      mockQueryBuilder,
    );

    const query: QueryClassGroupDto = {
      page: 1,
      pageSize: 20,
      schoolYearId: 1,
    };
    const result = await service.findAll(query);

    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
      'classGroups.gradeLevel',
      'ASC',
    );
    expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
      'classGroups.section',
      'ASC',
    );
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('manually assigns a section and returns capacity warning', async () => {
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '1',
    });
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({
      classroomId: '2',
      name: 'Room 2',
      capacity: 1,
    });
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue(null);

    const enrollmentRecords = [
      {
        enrollmentId: '10',
        schoolYearId: '1',
        gradeLevel: 5,
        classGroupId: null,
        active: true,
      },
      {
        enrollmentId: '11',
        schoolYearId: '1',
        gradeLevel: 5,
        classGroupId: null,
        active: true,
      },
    ];

    (enrollmentsRepository.find as jest.Mock).mockResolvedValue(enrollmentRecords);

    const classGroupRepo = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({
        classGroupId: '7',
        schoolYearId: '1',
        gradeLevel: 5,
        section: '01',
        classroom: { classroomId: '2' },
      }),
    };
    const enrollmentRepo = { update: jest.fn() };
    const fixedRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
    };

    (enrollmentsRepository.manager.transaction as jest.Mock).mockImplementation(
      async (callback: (manager: unknown) => unknown) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === ClassGroups) return classGroupRepo;
            if (entity === Enrollments) return enrollmentRepo;
            if (entity === ClassGroupFixedLocations) return fixedRepo;
            return null;
          },
        }),
    );

    const result = await service.manualAssignSection({
      schoolYearId: 1,
      gradeLevel: 5,
      section: '01',
      classroomId: 2,
      enrollmentIds: [10, 11],
      fixedLocation: true,
    });

    expect(enrollmentRepo.update).toHaveBeenCalled();
    expect(result.capacityWarning).toBe(true);
    expect(result.fixedLocationApplied).toBe(true);
    expect(result.classGroup.defaultClassroomId).toBe(2);
  });

  it('updates classroom assignment and applies fixed location', async () => {
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue({
      classGroupId: '7',
      schoolYearId: '1',
      gradeLevel: 5,
      section: '01',
      classroom: { classroomId: '1' },
      createdAt: new Date(),
    });
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({
      classroomId: '3',
      name: 'Room 3',
      capacity: 20,
    });
    (enrollmentsRepository.count as jest.Mock).mockResolvedValue(25);

    const classGroupRepo = {
      save: jest.fn().mockResolvedValue({
        classGroupId: '7',
        schoolYearId: '1',
        gradeLevel: 5,
        section: '01',
        classroom: { classroomId: '3' },
        createdAt: new Date(),
      }),
    };
    const fixedRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({}),
    };

    (enrollmentsRepository.manager.transaction as jest.Mock).mockImplementation(
      async (callback: (manager: unknown) => unknown) =>
        callback({
          getRepository: (entity: unknown) => {
            if (entity === ClassGroups) return classGroupRepo;
            if (entity === ClassGroupFixedLocations) return fixedRepo;
            return null;
          },
        }),
    );

    const result = await service.updateClassroomAssignment(7, 3, true);

    expect(result.capacityWarning).toBe(true);
    expect(result.fixedLocationApplied).toBe(true);
    expect(result.classGroup.defaultClassroomId).toBe(3);
  });
});
