import { NotFoundException } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { SubjectsService } from './subjects.service';
import { SubjectsRepository } from './subjects.repository';
import { SubjectAreasRepository } from '../subject_areas/subject_areas.repository';
import { CreateSubjectDto } from './dto/create-subject.dto';

type MockedSubjectsRepository = Partial<Record<keyof SubjectsRepository, jest.Mock>>;
type MockedSubjectAreasRepository = Partial<
  Record<keyof SubjectAreasRepository, jest.Mock>
>;

describe('SubjectsService', () => {
  let service: SubjectsService;
  let subjectsRepository: SubjectsRepository & MockedSubjectsRepository;
  let subjectAreasRepository: SubjectAreasRepository & MockedSubjectAreasRepository;

  const createDto: CreateSubjectDto = {
    areaId: 99,
    code: 'SCI_PHYS',
    name: 'Physics',
    description: 'Introductory physics',
  };

  beforeEach(() => {
    subjectsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as SubjectsRepository & MockedSubjectsRepository;

    subjectAreasRepository = {
      findOne: jest.fn(),
    } as unknown as SubjectAreasRepository & MockedSubjectAreasRepository;

    service = new SubjectsService(subjectsRepository, subjectAreasRepository);
  });

  it('throws NotFoundException when creating a subject with a missing area', async () => {
    (subjectAreasRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('paginates list results with q filter', async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    (subjectsRepository.createQueryBuilder as jest.Mock).mockReturnValue(
      mockQueryBuilder,
    );

    const result = await service.findAll({
      q: 'phys',
      page: 2,
      pageSize: 10,
      areaId: 3,
    });

    expect(mockQueryBuilder.where).toHaveBeenCalledWith('1=1');
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      expect.any(Brackets),
    );
    expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
      'subjects.area_id = :areaId',
      { areaId: '3' },
    );
    expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
    expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      data: [],
      total: 0,
      page: 2,
      pageSize: 10,
    });
  });
});
