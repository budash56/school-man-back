// Provides CRUD endpoints for course-instances using the generated CourseInstances entity.
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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CourseInstancesService } from './course_instances.service';
import { CourseInstancesQueryDto } from './dto/course-instances-query.dto';
import { CreateCourseInstanceDto } from './dto/create-course-instance.dto';
import { UpdateCourseInstanceDto } from './dto/update-course-instance.dto';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('course-instances')
@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('course-instances')
export class CourseInstancesController {
  constructor(private readonly courseInstancesService: CourseInstancesService) {}

  @Get()
  @ApiQuery({ name: 'schoolYearId', required: false, example: 3 })
  @ApiQuery({ name: 'gradeLevel', required: false, example: 10 })
  @ApiQuery({ name: 'subjectId', required: false, example: 12 })
  @ApiQuery({
    name: 'q',
    required: false,
    example: 'MATH',
    description: 'Keyword applied to course code and name',
  })
  findAll(@Query() query: CourseInstancesQueryDto) {
    return this.courseInstancesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.courseInstancesService.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  create(@Body() dto: CreateCourseInstanceDto) {
    return this.courseInstancesService.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseInstanceDto,
  ) {
    return this.courseInstancesService.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.courseInstancesService.remove(id);
  }
}
