import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { SharedModule } from '../shared/shared.module';
import { ReportsService } from './reports.service';
import { PrintIdService } from './print-id.service';
import { CertificatesController } from './controllers/certificates.controller';
import { GradesReportsController } from './controllers/grades.controller';
import { DocumentsReportsController } from './controllers/documents.controller';

@Module({
  imports: [RepositoriesModule, SharedModule],
  controllers: [
    CertificatesController,
    GradesReportsController,
    DocumentsReportsController,
  ],
  providers: [ReportsService, PrintIdService],
})
export class ReportsModule {}
