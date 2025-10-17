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
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { CourseInstancesService } from './course_instances.service';
import { CourseInstancesQueryDto } from './dto/course-instances-query.dto';
import { CreateCourseInstanceDto } from './dto/create-course-instance.dto';
import { UpdateCourseInstanceDto } from './dto/update-course-instance.dto';

@ApiTags('course-instances')
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

  @Post()
  create(@Body() dto: CreateCourseInstanceDto) {
    return this.courseInstancesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseInstanceDto,
  ) {
    return this.courseInstancesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.courseInstancesService.remove(id);
  }
}
