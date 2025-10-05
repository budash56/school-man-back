import { Test, TestingModule } from '@nestjs/testing';
import { TimetableSlotsController } from './timetable_slots.controller';

describe('TimetableSlotsController', () => {
  let controller: TimetableSlotsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimetableSlotsController],
    }).compile();

    controller = module.get<TimetableSlotsController>(TimetableSlotsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
