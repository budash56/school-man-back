// Provides CRUD endpoints for class-group curriculum overrides.
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { ClassGroupCurriculumOverridesService } from './class_group_curriculum_overrides.service';
import { CreateClassGroupCurriculumOverrideDto } from './dto/create-class-group-curriculum-override.dto';
import { UpdateClassGroupCurriculumOverrideDto } from './dto/update-class-group-curriculum-override.dto';
import { ClassGroupCurriculumOverridesQueryDto } from './dto/class-group-curriculum-overrides-query.dto';

@ApiTags('class-group-curriculum-overrides')
@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('class-group-curriculum-overrides')
export class ClassGroupCurriculumOverridesController {
  constructor(private readonly service: ClassGroupCurriculumOverridesService) {}

  @Get()
  @ApiQuery({ name: 'classGroupId', required: false, example: 20 })
  @ApiQuery({ name: 'curriculumItemId', required: false, example: 55 })
  findAll(@Query() query: ClassGroupCurriculumOverridesQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('admin')
  @Post()
  @ApiForbiddenResponse({ description: 'Forbidden: requires role admin' })
  create(@Body() dto: CreateClassGroupCurriculumOverrideDto) {
    return this.service.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  @ApiForbiddenResponse({ description: 'Forbidden: requires role admin' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassGroupCurriculumOverrideDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles('admin')
  @Delete(':id')
  @ApiForbiddenResponse({ description: 'Forbidden: requires role admin' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
