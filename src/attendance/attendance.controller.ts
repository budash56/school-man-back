import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SanitizedUser } from '../auth/auth.types';
import { ATTENDANCE_DELETE_ROLES, ATTENDANCE_MUTATE_ROLES, READ_ROLES, Roles } from '../auth/roles.decorator';

@Roles(...READ_ROLES)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  findAll(@Query() query: AttendanceQueryDto, @CurrentUser() user: SanitizedUser) {
    return this.attendanceService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: SanitizedUser) {
    return this.attendanceService.findOne(id, user);
  }

  @Roles(...ATTENDANCE_MUTATE_ROLES)
  @Post()
  create(@Body() dto: CreateAttendanceDto, @CurrentUser() user: SanitizedUser) {
    return this.attendanceService.create(dto, user);
  }

  @Roles(...ATTENDANCE_MUTATE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: SanitizedUser,
  ) {
    return this.attendanceService.update(id, dto, user);
  }

  @Roles(...ATTENDANCE_DELETE_ROLES)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.remove(id);
  }
}
