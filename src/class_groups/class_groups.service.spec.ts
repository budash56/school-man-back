import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ClassGroupsService } from './class_groups.service';
import { ClassGroupsRepository } from './class_groups.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { QueryClassGroupDto } from './dto/query-class-group.dto';

const createDto: CreateClassGroupDto = {
  schoolYearId: 1,
  gradeLevel: 10,
  section: '01',
  defaultClassroomId: 2,
};

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

    service = new ClassGroupsService(
      classGroupsRepository,
      schoolYearsRepository,
      classroomsRepository,
    );
  });

  it('creates a class group successfully', async () => {
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({ schoolYearId: '1' });
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({
      classroomId: '2',
      name: 'Room 202',
      capacity: 30,
    });
    (classGroupsRepository.create as jest.Mock).mockReturnValue({});
    (classGroupsRepository.save as jest.Mock).mockResolvedValue({ classGroupId: '5' });
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue(mockClassGroup);

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
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({ schoolYearId: '1' });
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({ classroomId: '2' });
    (classGroupsRepository.create as jest.Mock).mockReturnValue({});
    (classGroupsRepository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], { code: '23505', detail: 'uniq_cg_year_grade_section' }),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
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

    (classGroupsRepository.createQueryBuilder as jest.Mock).mockReturnValue(mockQueryBuilder);

    const query: QueryClassGroupDto = { page: 1, pageSize: 20, schoolYearId: 1 };
    const result = await service.findAll(query);

    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('classGroups.gradeLevel', 'ASC');
    expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('classGroups.section', 'ASC');
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
