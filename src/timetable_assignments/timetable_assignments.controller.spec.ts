import { Test, TestingModule } from '@nestjs/testing';
import { TimetableAssignmentsController } from './timetable_assignments.controller';

describe('TimetableAssignmentsController', () => {
  let controller: TimetableAssignmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimetableAssignmentsController],
    }).compile();

    controller = module.get<TimetableAssignmentsController>(TimetableAssignmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
