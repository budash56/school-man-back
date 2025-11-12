import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportsService } from '../reports.service';
import { TermGradeReportDto } from '../dto/term-grade-report.dto';
import { FinalGradeReportDto } from '../dto/final-grade-report.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { READ_ROLES, Roles } from '../../auth/roles.decorator';
import type { Request } from 'express';
import type { SanitizedUser } from '../../auth/auth.types';

type RequestWithUser = Request & {
  user?: Partial<SanitizedUser> & { userId?: number };
};

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports/grades')
export class GradesReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles('admin', 'coordinator', 'teacher')
  @Get('term')
  @ApiQuery({ name: 'studentId', required: true, example: 101 })
  @ApiQuery({ name: 'courseId', required: true, example: 15 })
  @ApiQuery({ name: 'termId', required: true, example: 4 })
  getTermReport(@Query() query: TermGradeReportDto, @Req() req: RequestWithUser) {
    return this.reportsService.getTermGradeReport(query, this.toActingUser(req));
  }

  @Roles('admin', 'coordinator', 'teacher')
  @Get('final')
  @ApiQuery({ name: 'studentId', required: true, example: 101 })
  @ApiQuery({ name: 'courseId', required: true, example: 15 })
  @ApiQuery({ name: 'schoolYearId', required: true, example: 3 })
  getFinalReport(
    @Query() query: FinalGradeReportDto,
    @Req() req: RequestWithUser,
  ) {
    return this.reportsService.getFinalGradeReport(
      query,
      this.toActingUser(req),
    );
  }

  private toActingUser(req: RequestWithUser) {
    if (!req.user) {
      return { role: 'teacher', userId: 0 };
    }

    const rawId =
      req.user.userId ??
      (req.user.nationalId ? Number(req.user.nationalId) : NaN);

    return {
      role: (req.user.role as SanitizedUser['role']) ?? 'teacher',
      userId: Number.isFinite(rawId) ? Number(rawId) : 0,
    };
  }
}
