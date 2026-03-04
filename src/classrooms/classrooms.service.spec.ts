import { NotFoundException } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsRepository } from './classrooms.repository';
import { BuildingsRepository } from '../buildings/buildings.repository';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { QueryClassroomDto } from './dto/query-classroom.dto';

const createDto: CreateClassroomDto = {
  buildingId: 10,
  capacity: 30,
};

describe('ClassroomsService', () => {
  let service: ClassroomsService;
  let classroomsRepository: jest.Mocked<ClassroomsRepository>;
  let buildingsRepository: jest.Mocked<BuildingsRepository>;

  beforeEach(() => {
    classroomsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<ClassroomsRepository>;

    buildingsRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<BuildingsRepository>;

    service = new ClassroomsService(classroomsRepository, buildingsRepository);
  });

  it('creates a classroom with the next available generated name', async () => {
    (buildingsRepository.findOne as jest.Mock).mockResolvedValue({
      buildingId: '10',
      name: 'Building A',
    });
    (classroomsRepository.find as jest.Mock).mockResolvedValue([
      { name: 'BuildingA_Aula01' },
    ]);
    (classroomsRepository.create as jest.Mock).mockImplementation(
      (payload) => payload,
    );
    (classroomsRepository.save as jest.Mock).mockResolvedValue({
      classroomId: '20',
    });
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({
      classroomId: '20',
      name: 'BuildingA_Aula02',
      buildingId: '10',
      capacity: 30,
      createdAt: new Date('2024-01-01'),
      building: { buildingId: '10', name: 'Building A' },
    });

    const result = await service.create(createDto);

    expect(classroomsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'BuildingA_Aula02',
        buildingId: '10',
        capacity: 30,
      }),
    );
    expect(result).toEqual({
      classroomId: 20,
      name: 'BuildingA_Aula02',
      buildingId: 10,
      building: { buildingId: 10, name: 'Building A' },
      capacity: 30,
      createdAt: new Date('2024-01-01'),
    });
  });

  it('throws when building does not exist', async () => {
    (buildingsRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('regenerates name when building changes on update', async () => {
    (classroomsRepository.findOne as jest.Mock).mockResolvedValue({
      classroomId: '1',
      name: 'BuildingA_Aula01',
      buildingId: '10',
      capacity: 22,
      createdAt: new Date('2024-01-01'),
      building: { buildingId: '10', name: 'Building A' },
    });
    (buildingsRepository.findOne as jest.Mock).mockResolvedValue({
      buildingId: '11',
      name: 'Building B',
    });
    (classroomsRepository.find as jest.Mock).mockResolvedValue([
      { name: 'BuildingB_Aula01' },
      { name: 'BuildingB_Aula02' },
    ]);
    (classroomsRepository.save as jest.Mock).mockResolvedValue({});

    const result = await service.update(1, {
      buildingId: 11,
      capacity: 25,
    });

    expect(classroomsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: '11',
        name: 'BuildingB_Aula03',
        capacity: 25,
      }),
    );
    expect(result.name).toBe('BuildingB_Aula03');
    expect(result.buildingId).toBe(11);
  });

  it('paginates and filters findAll by buildingId', async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([
          [
            {
              classroomId: '1',
              name: 'BuildingA_Aula01',
              buildingId: '10',
              capacity: 20,
              createdAt: new Date('2024-01-01'),
              building: { buildingId: '10', name: 'Building A' },
            },
          ],
          1,
        ]),
    };

    (classroomsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      mockQueryBuilder,
    );

    const query: QueryClassroomDto = {
      page: 1,
      pageSize: 10,
      buildingId: 10,
    };

    const result = await service.findAll(query);

    expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
      'classrooms.name',
      'ASC',
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'classrooms.building_id = :buildingId',
      { buildingId: '10' },
    );
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
