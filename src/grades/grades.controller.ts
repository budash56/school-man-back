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
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradesQueryDto } from './dto/grades-query.dto';
import type { SanitizedUser } from '../auth/auth.types';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Request } from 'express';

type ActingUser = {
  userId: number;
  role: SanitizedUser['role'];
};

type RequestWithUser = Request & {
  user?: Partial<SanitizedUser> & { userId?: number };
};

@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  findAll(@Query() query: GradesQueryDto, @Req() req: RequestWithUser) {
    return this.gradesService.findAll(query, this.toActingUser(req));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.findOne(id);
  }

  @Roles('teacher', 'admin')
  @Post()
  @ApiBody({
    type: CreateGradeDto,
    examples: {
      default: {
        summary: 'Record grade for student',
        value: {
          studentId: 2201,
          courseId: 15,
          termId: 3,
          mark: 'A',
          comment: 'Excellent performance',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role teacher, admin',
  })
  create(@Body() dto: CreateGradeDto, @Req() req: RequestWithUser) {
    return this.gradesService.create(dto, this.toActingUser(req));
  }

  @Roles('teacher', 'admin')
  @Patch(':id')
  @ApiBody({
    type: UpdateGradeDto,
    examples: {
      default: {
        summary: 'Update grade comment',
        value: {
          comment: 'Improved after retest',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role teacher, admin',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGradeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.gradesService.update(id, dto, this.toActingUser(req));
  }

  @Roles('teacher', 'admin')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role teacher, admin',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.remove(id);
  }

  private toActingUser(req: RequestWithUser): ActingUser {
    const rawId =
      req.user?.userId ??
      (req.user?.nationalId ? Number(req.user.nationalId) : NaN);
    return {
      userId: Number.isFinite(rawId) ? Number(rawId) : 0,
      role: (req.user?.role as SanitizedUser['role']) ?? 'teacher',
    };
  }
}
