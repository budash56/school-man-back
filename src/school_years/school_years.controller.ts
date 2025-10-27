// Provides CRUD endpoints for school-years using the generated SchoolYears entity.
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
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { SchoolYearsQueryDto } from './dto/school-years-query.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { SchoolYearsService } from './school_years.service';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';

@ApiTags('school-years')
@Roles(...READ_ROLES)
@Controller('school-years')
export class SchoolYearsController {
  constructor(private readonly schoolYearsService: SchoolYearsService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false, example: true })
  @ApiQuery({ name: 'name', required: false, example: '2025' })
  findAll(@Query() query: SchoolYearsQueryDto) {
    return this.schoolYearsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.schoolYearsService.findOne(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() dto: CreateSchoolYearDto) {
    return this.schoolYearsService.create(dto);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSchoolYearDto,
  ) {
    return this.schoolYearsService.update(id, dto);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.schoolYearsService.remove(id);
  }
}
