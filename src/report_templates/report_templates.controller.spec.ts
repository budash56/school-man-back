import { Test, TestingModule } from '@nestjs/testing';
import { ReportTemplatesController } from './report_templates.controller';

describe('ReportTemplatesController', () => {
  let controller: ReportTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportTemplatesController],
    }).compile();

    controller = module.get<ReportTemplatesController>(ReportTemplatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
