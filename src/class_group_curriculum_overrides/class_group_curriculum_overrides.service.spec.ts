import { NotFoundException } from '@nestjs/common';
import { ClassGroupCurriculumOverridesService } from './class_group_curriculum_overrides.service';
import { ClassGroupCurriculumOverridesRepository } from './class_group_curriculum_overrides.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { CurriculumItemsRepository } from '../curriculum_items/curriculum_items.repository';
import { CreateClassGroupCurriculumOverrideDto } from './dto/create-class-group-curriculum-override.dto';

const createRepo = <T>() => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  merge: jest.fn(),
  createQueryBuilder: jest.fn(),
}) as unknown as T;

describe('ClassGroupCurriculumOverridesService', () => {
  let service: ClassGroupCurriculumOverridesService;
  let repository: ClassGroupCurriculumOverridesRepository;
  let classGroupsRepository: ClassGroupsRepository;
  let curriculumItemsRepository: CurriculumItemsRepository;

  const createDto: CreateClassGroupCurriculumOverrideDto = {
    classGroupId: 10,
    curriculumItemId: 21,
    weeklyHoursOverride: 4,
    doubleSessionOverride: true,
    isDisabled: false,
  };

  beforeEach(() => {
    repository = createRepo<ClassGroupCurriculumOverridesRepository>();
    classGroupsRepository = createRepo<ClassGroupsRepository>();
    curriculumItemsRepository = createRepo<CurriculumItemsRepository>();

    service = new ClassGroupCurriculumOverridesService(
      repository,
      classGroupsRepository,
      curriculumItemsRepository,
    );
  });

  it('throws NotFoundException when class group does not exist', async () => {
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue(null);

    await expect(service.create(createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates override successfully', async () => {
    (classGroupsRepository.findOne as jest.Mock).mockResolvedValue({
      classGroupId: '10',
    });
    (curriculumItemsRepository.findOne as jest.Mock).mockResolvedValue({
      curriculumItemId: '21',
    });

    const entity = { overrideId: '1', classGroupId: '10', curriculumItemId: '21' };
    (repository.create as jest.Mock).mockReturnValue(entity);
    (repository.save as jest.Mock).mockResolvedValue(entity);

    const result = await service.create(createDto);

    expect(repository.create as jest.Mock).toHaveBeenCalled();
    expect(result).toEqual(entity);
  });
});
