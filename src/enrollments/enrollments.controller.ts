import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentsQueryDto } from './dto/enrollments-query.dto';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse } from '@nestjs/swagger';
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
      withoutSection: {
        summary: 'Enroll student into a grade without section assignment',
        value: {
          studentId: 501,
          gradeLevel: 7,
          schoolYearId: 2,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateEnrollmentDto, @Req() req: RequestWithUser) {
    return this.enrollmentsService.create(dto, this.toActingUser(req));
  }

  @Roles('admin', 'coordinator')
  @Patch(':id/deactivate')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    return this.enrollmentsService.deactivate(id, this.toActingUser(req));
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.enrollmentsService.remove(id, this.toActingUser(req));
  }

  private toActingUser(req: RequestWithUser) {
    if (!req.user) {
      return undefined;
    }
    return {
      teacherId: req.user.nationalId,
      role: req.user.role ?? 'teacher',
    };
  }
}
