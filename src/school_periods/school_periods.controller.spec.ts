import { Test, TestingModule } from '@nestjs/testing';
import { SchoolPeriodsController } from './school_periods.controller';

describe('SchoolPeriodsController', () => {
  let controller: SchoolPeriodsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchoolPeriodsController],
    }).compile();

    controller = module.get<SchoolPeriodsController>(SchoolPeriodsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
