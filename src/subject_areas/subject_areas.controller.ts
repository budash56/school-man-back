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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateSubjectAreaDto } from './dto/create-subject-area.dto';
import { SubjectAreasQueryDto } from './dto/subject-areas-query.dto';
import { UpdateSubjectAreaDto } from './dto/update-subject-area.dto';
import { SubjectAreasService } from './subject_areas.service';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('subject-areas')
@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
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

  @Roles('admin', 'coordinator')
  @Post()
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateSubjectAreaDto) {
    return this.subjectAreasService.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubjectAreaDto,
  ) {
    return this.subjectAreasService.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subjectAreasService.remove(id);
  }
}
