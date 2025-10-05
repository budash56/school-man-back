import { Test, TestingModule } from '@nestjs/testing';
import { ClassGroupsController } from './class_groups.controller';

describe('ClassGroupsController', () => {
  let controller: ClassGroupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassGroupsController],
    }).compile();

    controller = module.get<ClassGroupsController>(ClassGroupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
