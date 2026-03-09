import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { SubjectAreasService } from './subject_areas.service';
import { SubjectAreasRepository } from './subject_areas.repository';
import { CreateSubjectAreaDto } from './dto/create-subject-area.dto';

type MockedSubjectAreasRepository = Partial<
  Record<keyof SubjectAreasRepository, jest.Mock>
>;

const createDriverError = (
  overrides: Partial<{ code?: string; constraint?: string }>,
) => Object.assign(new Error(), overrides);

describe('SubjectAreasService', () => {
  let service: SubjectAreasService;
  let repository: SubjectAreasRepository & MockedSubjectAreasRepository;

  const createDto: CreateSubjectAreaDto = {
    code: 'MATH',
    name: 'Mathematics',
  };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      merge: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as SubjectAreasRepository & MockedSubjectAreasRepository;

    service = new SubjectAreasService(repository);
  });

  it('throws ConflictException on duplicate area code', async () => {
    (repository.create as jest.Mock).mockReturnValue(createDto);
    (repository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], createDriverError({ code: '23505' })),
    );

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('creates a subject area successfully', async () => {
    const entity = { areaId: '12', code: 'MATH', name: 'Mathematics' };
    (repository.create as jest.Mock).mockReturnValue(entity);
    (repository.save as jest.Mock).mockResolvedValue(entity);

    const result = await service.create(createDto);

    expect(repository.create as jest.Mock).toHaveBeenCalledWith({
      code: createDto.code,
      name: createDto.name,
      isSpecialization: false,
    });
    expect(result).toEqual(entity);
  });

  it('includes subjects when includeSubjects is true', async () => {
    const qb = {
      orderBy: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([[{ areaId: '1', name: 'Math' }], 1]),
    };

    (repository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    (repository.find as jest.Mock).mockResolvedValue([
      { areaId: '1', name: 'Math', subjects: [] },
    ]);

    const result = await service.findAll({ includeSubjects: true });

    expect(repository.find as jest.Mock).toHaveBeenCalled();
    expect(result.data[0]).toHaveProperty('subjects');
  });
});
