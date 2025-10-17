import { BadRequestException, ConflictException } from '@nestjs/common';
import { TermsService } from './terms.service';
import { TermsRepository } from './terms.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { CreateTermDto } from './dto/create-term.dto';
import { TermName } from './dto/term-name.enum';

type MockedTermsRepository = Partial<Record<keyof TermsRepository, jest.Mock>>;
type MockedSchoolYearsRepository = Partial<
  Record<keyof SchoolYearsRepository, jest.Mock>
>;

const SCHOOL_YEAR = {
  schoolYearId: '1',
  yearStart: '2025-01-01',
  yearEnd: '2025-12-31',
};

describe('TermsService', () => {
  let service: TermsService;
  let repository: TermsRepository & MockedTermsRepository;
  let schoolYearsRepository: SchoolYearsRepository & MockedSchoolYearsRepository;

  const createDto: CreateTermDto = {
    schoolYearId: 1,
    name: TermName.P1,
    startDate: '2025-02-01',
    endDate: '2025-03-01',
  };

  beforeEach(() => {
    repository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    } as unknown as TermsRepository & MockedTermsRepository;

    schoolYearsRepository = {
      findOne: jest.fn(),
    } as unknown as SchoolYearsRepository & MockedSchoolYearsRepository;

    service = new TermsService(repository, schoolYearsRepository);
  });

  it('throws BadRequestException when term dates fall outside the school year', async () => {
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue(SCHOOL_YEAR);
    (repository.find as jest.Mock).mockResolvedValue([]);

    await expect(
      service.create({
        ...createDto,
        startDate: '2024-12-20',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException when term overlaps another term in the same year', async () => {
    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue(SCHOOL_YEAR);
    (repository.find as jest.Mock).mockResolvedValue([
      {
        termId: '2',
        schoolYearId: '1',
        startDate: '2025-02-15',
        endDate: '2025-03-15',
      },
    ]);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a term and lists it successfully', async () => {
    const savedTerm = {
      termId: '3',
      ...createDto,
      schoolYearId: '1',
      sortOrder: 1,
      isFinal: false,
    };

    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([savedTerm]),
    };

    (schoolYearsRepository.findOne as jest.Mock).mockResolvedValue(SCHOOL_YEAR);
    (repository.find as jest.Mock).mockResolvedValue([]);
    (repository.create as jest.Mock).mockImplementation((payload) => payload);
    (repository.save as jest.Mock).mockResolvedValue(savedTerm);
    (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const created = await service.create(createDto);

    expect(repository.create as jest.Mock).toHaveBeenCalledWith({
      schoolYearId: '1',
      name: TermName.P1,
      startDate: createDto.startDate,
      endDate: createDto.endDate,
      sortOrder: 1,
      isFinal: false,
    });
    expect(created).toEqual(savedTerm);

    const list = await service.findAll({ schoolYearId: 1 });
    expect(list).toEqual([savedTerm]);
    expect(qb.andWhere).toHaveBeenCalledWith('terms.schoolYearId = :schoolYearId', {
      schoolYearId: '1',
    });
  });
});
