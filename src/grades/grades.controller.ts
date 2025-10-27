import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { GradesService } from './grades.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradesQueryDto } from './dto/grades-query.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SanitizedUser } from '../auth/auth.types';
import { GRADE_MUTATE_ROLES, READ_ROLES, Roles } from '../auth/roles.decorator';

@Roles(...READ_ROLES)
@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  findAll(@Query() query: GradesQueryDto) {
    return this.gradesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.findOne(id);
  }

  @Roles(...GRADE_MUTATE_ROLES)
  @Post()
  create(@Body() dto: CreateGradeDto, @CurrentUser() user: SanitizedUser) {
    return this.gradesService.create(dto, user);
  }

  @Roles(...GRADE_MUTATE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGradeDto,
    @CurrentUser() user: SanitizedUser,
  ) {
    return this.gradesService.update(id, dto, user);
  }

  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.remove(id);
  }
}
