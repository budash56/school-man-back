import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ClassGroupsService } from './class_groups.service';
import { ClassGroupsRepository } from './class_groups.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';
import { CreateClassGroupDto } from './dto/create-class-group.dto';

type MockedClassGroupsRepository = Partial<
  Record<keyof ClassGroupsRepository, jest.Mock>
>;

type MockedSchoolYearsRepository = Partial<
  Record<keyof SchoolYearsRepository, jest.Mock>
>;

type MockedClassroomsRepository = Partial<
  Record<keyof ClassroomsRepository, jest.Mock>
>;

describe('ClassGroupsService', () => {
  let service: ClassGroupsService;
  let classGroupsRepository: ClassGroupsRepository & MockedClassGroupsRepository;
  let schoolYearsRepository: SchoolYearsRepository & MockedSchoolYearsRepository;
  let classroomsRepository: ClassroomsRepository & MockedClassroomsRepository;

  const createDto: CreateClassGroupDto = {
    schoolYearId: 1,
    gradeLevel: 5,
    section: '02',
    defaultClassroomId: 3,
  };

  beforeEach(() => {
    classGroupsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as ClassGroupsRepository & MockedClassGroupsRepository;

    schoolYearsRepository = {
      findOne: jest.fn(),
    } as unknown as SchoolYearsRepository & MockedSchoolYearsRepository;

    classroomsRepository = {
      findOne: jest.fn(),
    } as unknown as ClassroomsRepository & MockedClassroomsRepository;

    service = new ClassGroupsService(
      classGroupsRepository,
      schoolYearsRepository,
      classroomsRepository,
    );
  });

  it('throws ConflictException on duplicate schoolYear/gradeLevel/section triple', async () => {
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({
      schoolYearId: '1',
    });
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({
      classroomId: '3',
    });
    (classGroupsRepository.create as jest.Mock).mockReturnValue({});
    (classGroupsRepository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' }),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a class group and returns hydrated response', async () => {
    const classroom = { classroomId: '3' };
    const created = { classGroupId: undefined };
    const persisted = { classGroupId: '42' };
    const hydrated = {
      classGroupId: '42',
      schoolYearId: '1',
      gradeLevel: 5,
      section: '02',
      classroom,
      createdAt: new Date('2024-01-01'),
    };

    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue({ schoolYearId: '1' });
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue(classroom);
    (classGroupsRepository.create as jest.Mock).mockReturnValue(created);
    (classGroupsRepository.save as jest.Mock).mockResolvedValue(persisted);
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue(hydrated);

    const result = await service.create(createDto);

    expect(classGroupsRepository.create as jest.Mock).toHaveBeenCalledWith({
      schoolYearId: '1',
      gradeLevel: createDto.gradeLevel,
      section: createDto.section,
    });
    expect(classGroupsRepository.save as jest.Mock).toHaveBeenCalledWith(created);
    expect(classGroupsRepository.findOne as jest.Mock).toHaveBeenCalledWith({
      where: { classGroupId: persisted.classGroupId },
      relations: { classroom: true },
    });
    expect(result).toEqual({
      classGroupId: 42,
      schoolYearId: 1,
      gradeLevel: hydrated.gradeLevel,
      section: hydrated.section,
      code: `${hydrated.gradeLevel}${hydrated.section}`,
      defaultClassroomId: Number(classroom.classroomId),
      createdAt: hydrated.createdAt,
    });
  });
});
