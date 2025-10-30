import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { SchoolYearsService } from './school_years.service';
import { SchoolYearsRepository } from './school_years.repository';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';

type MockedRepository = Partial<Record<keyof SchoolYearsRepository, jest.Mock>> & {
  manager: { transaction: jest.Mock };
};

describe('SchoolYearsService', () => {
  let service: SchoolYearsService;
  let repository: SchoolYearsRepository & MockedRepository;

  const createDto: CreateSchoolYearDto = {
    name: '2025-2026',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    active: true,
  };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      merge: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    } as unknown as SchoolYearsRepository & MockedRepository;

    service = new SchoolYearsService(repository);
  });

  it('throws BadRequestException when start date is after end date', async () => {
    await expect(
      service.create({
        ...createDto,
        startDate: '2025-12-31',
        endDate: '2025-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException when name is duplicated', async () => {
    (repository.create as jest.Mock).mockReturnValue(createDto);
    (repository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' }),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a school year successfully', async () => {
    const entity = {
      schoolYearId: '7',
      name: createDto.name,
      yearStart: createDto.startDate,
      yearEnd: createDto.endDate,
      isActive: createDto.active,
    };

    (repository.create as jest.Mock).mockReturnValue(entity);
    (repository.save as jest.Mock).mockResolvedValue(entity);

    const result = await service.create(createDto);

    expect(repository.create as jest.Mock).toHaveBeenCalledWith({
      name: createDto.name,
      yearStart: createDto.startDate,
      yearEnd: createDto.endDate,
      isActive: createDto.active,
    });
    expect(result).toBe(entity);
  });

  it('rollover creates new active year and deactivates previous', async () => {
    const previousYear = {
      schoolYearId: '1',
      name: '2025',
      yearStart: '2025-01-01',
      yearEnd: '2025-12-31',
      isActive: true,
    };

    const transactionRepository = {
      findOne: jest.fn().mockResolvedValue(previousYear),
      save: jest
        .fn()
        .mockImplementationOnce(async (entity) => entity)
        .mockImplementationOnce(async (entity) => ({
          ...entity,
          schoolYearId: '2',
        })),
      create: jest.fn().mockImplementation((data) => ({
        ...data,
        schoolYearId: '2',
      })),
      count: jest.fn().mockResolvedValue(1),
    };

    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionRepository),
    };

    (repository.manager.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback(manager as never),
    );

    const result = await service.rollover(
      { startDate: '2026-01-01', endDate: '2026-12-31' },
      { role: 'admin' },
    );

    expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(transactionRepository.create).toHaveBeenCalledWith({
      name: '2026',
      yearStart: '2026-01-01',
      yearEnd: '2026-12-31',
      isActive: true,
    });
    expect(transactionRepository.save).toHaveBeenCalledTimes(2);
    expect(transactionRepository.count).toHaveBeenCalledWith({ where: { isActive: true } });
    expect(previousYear.isActive).toBe(false);
    expect(result.previous).toEqual(
      expect.objectContaining({
        schoolYearId: '1',
        isActive: false,
      }),
    );
    expect(result.current).toEqual(
      expect.objectContaining({
        schoolYearId: '2',
        isActive: true,
        yearStart: '2026-01-01',
        yearEnd: '2026-12-31',
      }),
    );
  });

  it('throws NotFoundException when removing missing school year', async () => {
    (repository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when rollover encounters duplicate name', async () => {
    const transactionRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockRejectedValue(new QueryFailedError('', [], { code: '23505' })),
      create: jest.fn().mockImplementation((data) => data),
      count: jest.fn(),
    };

    const manager = {
      getRepository: jest.fn().mockReturnValue(transactionRepository),
    };

    (repository.manager.transaction as jest.Mock).mockImplementation(async (callback) =>
      callback(manager as never),
    );

    await expect(
      service.rollover({ startDate: '2026-01-01', endDate: '2026-12-31' }, { role: 'admin' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transactionRepository.create).toHaveBeenCalledWith({
      name: '2026',
      yearStart: '2026-01-01',
      yearEnd: '2026-12-31',
      isActive: true,
    });
    expect(transactionRepository.save).toHaveBeenCalledTimes(1);
  });
});
