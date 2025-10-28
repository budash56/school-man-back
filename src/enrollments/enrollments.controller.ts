import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentsQueryDto } from './dto/enrollments-query.dto';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Request } from 'express';

type RequestWithUser = Request & {
  user?: { userId?: number; nationalId?: string; role?: string };
};

@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  findAll(@Query() query: EnrollmentsQueryDto, @Req() req: RequestWithUser) {
    return this.enrollmentsService.findAll(query, this.toActingUser(req));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentsService.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiBody({
    type: CreateEnrollmentDto,
    examples: {
      default: {
        summary: 'Enroll student into class group',
        value: {
          studentId: 501,
          classGroupId: 10,
          schoolYearId: 2,
        },
      },
    },
  })
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentsService.deactivate(id);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentsService.remove(id);
  }

  private toActingUser(req: RequestWithUser) {
    if (!req.user) {
      return undefined;
    }
    const rawId = req.user.userId ?? (req.user.nationalId ? Number(req.user.nationalId) : NaN);
    return {
      userId: Number.isFinite(rawId) ? Number(rawId) : 0,
      role: req.user.role ?? 'teacher',
    };
  }
}
