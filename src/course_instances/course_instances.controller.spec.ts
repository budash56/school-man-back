import { Test, TestingModule } from '@nestjs/testing';
import { CourseInstancesController } from './course_instances.controller';

describe('CourseInstancesController', () => {
  let controller: CourseInstancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseInstancesController],
    }).compile();

    controller = module.get<CourseInstancesController>(CourseInstancesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
