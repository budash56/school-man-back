// Provides CRUD endpoints for subjects using the generated Subjects entity.
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
import { CreateSubjectDto } from './dto/create-subject.dto';
import { SubjectsQueryDto } from './dto/subjects-query.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectsService } from './subjects.service';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('subjects')
@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 25 })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search keyword applied to subject code and name',
  })
  @ApiQuery({
    name: 'areaId',
    required: false,
    example: 1,
    description: 'Restrict results to a specific subject area',
  })
  findAll(@Query() query: SubjectsQueryDto) {
    return this.subjectsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.subjectsService.remove(id);
  }
}
