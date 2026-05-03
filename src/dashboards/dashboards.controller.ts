import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardsService } from './dashboards.service';
import { AttendanceWeeklyQueryDto } from './dto/attendance-weekly-query.dto';
import { FailingRateQueryDto } from './dto/failing-rate-query.dto';
import { DisciplineHeatmapQueryDto } from './dto/discipline-heatmap-query.dto';
import { TeacherWorkloadQueryDto } from './dto/teacher-workload-query.dto';
import { DashboardMetricsQueryDto } from './dto/dashboard-metrics-query.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import type { SanitizedUser } from '../auth/auth.types';

type RequestWithUser = Request & {
  user?: Partial<SanitizedUser> & { userId?: number };
};

@ApiTags('dashboards')
@ApiBearerAuth()
@Roles('admin', 'coordinator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Roles('admin', 'coordinator', 'teacher')
  @Get('metrics')
  getMetrics(
    @Query() query: DashboardMetricsQueryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.dashboardsService.getMetrics(query, {
      nationalId: req.user?.nationalId ?? '',
      role: (req.user?.role as SanitizedUser['role']) ?? 'teacher',
    });
  }

  @Get('attendance/weekly')
  getWeeklyAttendance(@Query() query: AttendanceWeeklyQueryDto) {
    return this.dashboardsService.getWeeklyAttendance(query);
  }

  @Get('failing-rate')
  getFailingRate(@Query() query: FailingRateQueryDto) {
    return this.dashboardsService.getFailingRate(query);
  }

  @Get('discipline/heatmap')
  getDisciplineHeatmap(@Query() query: DisciplineHeatmapQueryDto) {
    return this.dashboardsService.getDisciplineHeatmap(query);
  }

  @Get('teacher-workload')
  getTeacherWorkload(@Query() query: TeacherWorkloadQueryDto) {
    return this.dashboardsService.getTeacherWorkload(query);
  }
}
