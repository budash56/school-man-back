import { Test, TestingModule } from '@nestjs/testing';
import { DisciplinaryRecordsController } from './disciplinary_records.controller';

describe('DisciplinaryRecordsController', () => {
  let controller: DisciplinaryRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisciplinaryRecordsController],
    }).compile();

    controller = module.get<DisciplinaryRecordsController>(DisciplinaryRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
