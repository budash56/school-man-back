import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { SubjectAreasService } from './subject_areas.service';
import { SubjectAreasRepository } from './subject_areas.repository';
import { CreateSubjectAreaDto } from './dto/create-subject-area.dto';

type MockedSubjectAreasRepository = Partial<
  Record<keyof SubjectAreasRepository, jest.Mock>
>;

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
      remove: jest.fn(),
      merge: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as SubjectAreasRepository & MockedSubjectAreasRepository;

    service = new SubjectAreasService(repository);
  });

  it('throws ConflictException on duplicate area code', async () => {
    (repository.create as jest.Mock).mockReturnValue(createDto);
    (repository.save as jest.Mock).mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' }),
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
    });
    expect(result).toEqual(entity);
  });
});
