// Provides CRUD endpoints for subject-areas using the generated SubjectAreas entity.
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
import { CreateSubjectAreaDto } from './dto/create-subject-area.dto';
import { SubjectAreasQueryDto } from './dto/subject-areas-query.dto';
import { UpdateSubjectAreaDto } from './dto/update-subject-area.dto';
import { SubjectAreasService } from './subject_areas.service';

@ApiTags('subject-areas')
@Controller('subject-areas')
export class SubjectAreasController {
  constructor(private readonly subjectAreasService: SubjectAreasService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search keyword applied to area code and name',
  })
  findAll(@Query() query: SubjectAreasQueryDto) {
    return this.subjectAreasService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subjectAreasService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSubjectAreaDto) {
    return this.subjectAreasService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubjectAreaDto,
  ) {
    return this.subjectAreasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subjectAreasService.remove(id);
  }
}
