import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardsService } from './dashboards.service';
import { AttendanceWeeklyQueryDto } from './dto/attendance-weekly-query.dto';
import { FailingRateQueryDto } from './dto/failing-rate-query.dto';
import { DisciplineHeatmapQueryDto } from './dto/discipline-heatmap-query.dto';
import { TeacherWorkloadQueryDto } from './dto/teacher-workload-query.dto';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('dashboards')
@ApiBearerAuth()
@Roles('admin', 'coordinator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

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
