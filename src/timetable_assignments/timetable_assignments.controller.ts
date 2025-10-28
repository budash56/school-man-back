// Provides CRUD endpoints for timetable-assignments using the generated TimetableAssignments entity.
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import { TimetableAssignments } from './timetable_assignments.entity';
import { TimetableAssignmentsRepository } from './timetable_assignments.repository';
import { TimetableAssignmentsService, TimetableAssignmentsQuery } from './timetable_assignments.service';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';
import { Request } from 'express';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';

type RequestWithUser = Request & {
  user?: { userId?: number; nationalId?: string; role?: string };
};

@Roles(...READ_ROLES)
@ApiBearerAuth()
@Controller('timetable-assignments')
export class TimetableAssignmentsController {
  constructor(
    private readonly repository: TimetableAssignmentsRepository,
    private readonly assignmentsService: TimetableAssignmentsService,
  ) {}

  @Get()
  findAll(@Req() req: RequestWithUser) {
    const query = this.parseQuery(req) as TimetableAssignmentsQuery;
    return this.assignmentsService.findAll(query, this.toActingUser(req));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { assignmentId: id },
    });

    if (!entity) {
      throw new NotFoundException('TimetableAssignments record not found');
    }

    return entity;
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiBody({
    schema: {
      example: {
        courseId: 15,
        slotId: 3,
        teacherId: 'teacher-001',
        classGroupId: 9,
        classroomId: 2,
      },
    },
  })
  create(@Body() payload: DeepPartial<TimetableAssignments>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  @ApiBody({
    schema: {
      example: {
        teacherId: 'teacher-002',
        classroomId: 4,
      },
    },
  })
  async update(@Param('id') id: string, @Body() payload: DeepPartial<TimetableAssignments>) {
    const entity = await this.findOne(id);
    this.repository.merge(entity, payload);
    return this.repository.save(entity);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }

  private parseQuery(req: RequestWithUser): TimetableAssignmentsQuery {
    const { courseId, classGroupId, teacherId, slotId } = req.query;
    return {
      courseId: courseId !== undefined ? Number(courseId) : undefined,
      classGroupId: classGroupId !== undefined ? Number(classGroupId) : undefined,
      teacherId: teacherId !== undefined ? Number(teacherId) : undefined,
      slotId: slotId !== undefined ? Number(slotId) : undefined,
    };
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
