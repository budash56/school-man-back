// Provides CRUD endpoints for students using the generated Students entity.
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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentsQueryDto } from './dto/students-query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('students')
@Roles(...READ_ROLES)
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({
    name: 'q',
    required: false,
    description:
      'Search keyword applied to nationalId, firstName, and lastName',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    description: 'Filters students enrolled in the provided school year ID',
    example: 2025,
  })
  findAll(@Query() query: StudentsQueryDto) {
    return this.studentsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStudentDto) {
    return this.studentsService.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.remove(id);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id/restore')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.studentsService.restore(id);
  }
}
