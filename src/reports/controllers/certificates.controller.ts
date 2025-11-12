import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { ReportsService } from '../reports.service';
import { ActiveStudentCertificateDto } from '../dto/active-student-certificate.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports/certificates')
export class CertificatesController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles('admin', 'coordinator')
  @Post('active-student')
  @ApiBody({
    type: ActiveStudentCertificateDto,
    examples: {
      default: {
        summary: 'Generate active student certificate',
        value: { studentId: 101, schoolYearId: 3 },
      },
    },
  })
  async generateActiveStudentCertificate(
    @Body() dto: ActiveStudentCertificateDto,
  ) {
    return this.reportsService.generateActiveStudentCertificate(dto);
  }
}
