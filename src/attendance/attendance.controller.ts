import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import type { SanitizedUser } from '../auth/auth.types';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Request } from 'express';

type ActingUser = {
  userId: number;
  nationalId: string;
  role: SanitizedUser['role'];
};

type RequestWithUser = Request & {
  user?: Partial<SanitizedUser> & { userId?: number };
};

@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  findAll(
    @Query() query: AttendanceQueryDto,
    @Query('scope') scope: 'own' | 'group' | undefined,
    @Req() req: RequestWithUser,
  ) {
    const normalizedQuery = { ...query } as AttendanceQueryDto;
    if (scope !== undefined) {
      normalizedQuery.scope = scope;
    }

    return this.attendanceService.findAll(normalizedQuery, this.toActingUser(req));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.attendanceService.findOne(id, this.toActingUser(req));
  }

  @Roles('teacher', 'admin', 'coordinator')
  @Post()
  @ApiBody({
    type: CreateAttendanceDto,
    examples: {
      default: {
        summary: 'Record attendance for a student',
        value: {
          studentId: 101,
          courseId: 12,
          slotId: 5,
          date: '2024-09-02',
          status: 'P',
        },
      },
    },
  })
  create(@Body() dto: CreateAttendanceDto, @Req() req: RequestWithUser) {
    return this.attendanceService.create(dto, this.toActingUser(req));
  }

  @Roles('teacher', 'admin', 'coordinator')
  @Patch(':id')
  @ApiBody({
    type: UpdateAttendanceDto,
    examples: {
      default: {
        summary: 'Update attendance status',
        value: {
          status: 'AE',
          excusedAt: '2024-09-03T10:00:00.000Z',
        },
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttendanceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.attendanceService.update(id, dto, this.toActingUser(req));
  }

  @Roles('teacher', 'admin', 'coordinator')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceService.remove(id);
  }

  private toActingUser(req: RequestWithUser): ActingUser {
    const rawId = req.user?.userId ?? (req.user?.nationalId ? Number(req.user.nationalId) : NaN);
    return {
      userId: Number.isFinite(rawId) ? Number(rawId) : 0,
      nationalId: req.user?.nationalId ?? '',
      role: (req.user?.role as SanitizedUser['role']) ?? 'teacher',
    };
  }
}
