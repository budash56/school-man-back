// Provides CRUD endpoints for teacher-subject capabilities.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { TeacherSubjectsService } from './teacher_subjects.service';
import { CreateTeacherSubjectDto } from './dto/create-teacher-subject.dto';
import { TeacherSubjectsQueryDto } from './dto/teacher-subjects-query.dto';

@ApiTags('teacher-subjects')
@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teacher-subjects')
export class TeacherSubjectsController {
  constructor(private readonly service: TeacherSubjectsService) {}

  @Get()
  @ApiQuery({ name: 'teacherId', required: false, example: '199001011234' })
  @ApiQuery({ name: 'subjectId', required: false, example: 12 })
  findAll(@Query() query: TeacherSubjectsQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateTeacherSubjectDto) {
    return this.service.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
