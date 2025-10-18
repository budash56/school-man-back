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
});
