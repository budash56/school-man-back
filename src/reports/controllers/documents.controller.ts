import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from '../reports.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { StudentRecordReportDto } from '../dto/student-record-report.dto';
import { EligibilityReportDto } from '../dto/eligibility-report.dto';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports/documents')
export class DocumentsReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles('admin', 'coordinator', 'registrar')
  @Get('student-record')
  @ApiQuery({ name: 'studentId', required: true, example: 101 })
  @ApiQuery({ name: 'schoolYearId', required: true, example: 3 })
  @ApiQuery({ name: 'periods', required: false, example: '1,2,3' })
  getStudentRecord(@Query() query: StudentRecordReportDto) {
    return this.reportsService.getStudentRecordReport(query);
  }

  @Roles('admin', 'coordinator', 'registrar')
  @Get('eligibility')
  @ApiQuery({ name: 'schoolYearId', required: true, example: 3 })
  @ApiQuery({ name: 'gradeLevel', required: true, example: 10 })
  @ApiQuery({ name: 'classGroupId', required: false, example: 12 })
  getEligibility(@Query() query: EligibilityReportDto) {
    return this.reportsService.getEligibilityReport(query);
  }
}
