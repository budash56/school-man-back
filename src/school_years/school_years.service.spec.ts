import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { SchoolYearsService } from './school_years.service';
import { SchoolYearsRepository } from './school_years.repository';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';

type MockedRepository = Partial<Record<keyof SchoolYearsRepository, jest.Mock>>;

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

  it('updates a school year and validates dates', async () => {
    const existing = {
      schoolYearId: '7',
      name: createDto.name,
      yearStart: createDto.startDate,
      yearEnd: createDto.endDate,
      isActive: true,
    };

    (repository.findOne as jest.Mock).mockResolvedValue(existing);
    (repository.save as jest.Mock).mockImplementation(async () => existing);

    const updateDto: UpdateSchoolYearDto = {
      startDate: '2025-02-01',
      endDate: '2025-12-20',
      active: false,
    };

    await service.update(7, updateDto);

    expect(repository.save as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        yearStart: updateDto.startDate,
        yearEnd: updateDto.endDate,
        isActive: updateDto.active,
      }),
    );
  });

  it('throws NotFoundException when removing missing school year', async () => {
    (repository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
