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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TimetableAssignments } from './timetable_assignments.entity';
import { TimetableAssignmentsRepository } from './timetable_assignments.repository';
import { TimetableAssignmentsService } from './timetable_assignments.service';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTimetableAssignmentDto } from './dto/create-timetable-assignment.dto';
import { UpdateTimetableAssignmentDto } from './dto/update-timetable-assignment.dto';
import { TimetableAssignmentsQueryDto } from './dto/timetable-assignments-query.dto';

type RequestWithUser = Request & {
  user?: { userId?: number; nationalId?: string; role?: string };
};

@ApiTags('timetable-assignments')
@Roles(...READ_ROLES)
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timetable-assignments')
export class TimetableAssignmentsController {
  constructor(
    private readonly repository: TimetableAssignmentsRepository,
    private readonly assignmentsService: TimetableAssignmentsService,
  ) {}

  @Get()
  findAll(
    @Query() query: TimetableAssignmentsQueryDto,
    @Req() req: RequestWithUser,
  ) {
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
  @ApiBody({ type: CreateTimetableAssignmentDto })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  create(
    @Body() payload: CreateTimetableAssignmentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.assignmentsService.create(payload, req.user);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  @ApiBody({ type: UpdateTimetableAssignmentDto })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateTimetableAssignmentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.assignmentsService.update(id, payload, req.user);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.assignmentsService.remove(id, req.user);
  }

  private toActingUser(req: RequestWithUser) {
    if (!req.user) {
      return undefined;
    }
    const rawId =
      req.user.userId ??
      (req.user.nationalId ? Number(req.user.nationalId) : NaN);
    return {
      userId: Number.isFinite(rawId) ? Number(rawId) : 0,
      role: req.user.role ?? 'teacher',
    };
  }
}
