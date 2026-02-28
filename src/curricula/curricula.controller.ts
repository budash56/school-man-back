// Provides endpoints for managing grade-level curricula.
import {
  Body,
  Controller,
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
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { CurriculaQueryDto } from './dto/curricula-query.dto';
import { UpdateCurriculumAreaDto } from './dto/update-curriculum-area.dto';
import { CurriculaService } from './curricula.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { READ_ROLES, Roles } from '../auth/roles.decorator';

@ApiTags('curricula')
@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('curricula')
export class CurriculaController {
  constructor(private readonly service: CurriculaService) {}

  @Get()
  @ApiQuery({ name: 'gradeLevel', required: false, example: 10 })
  @ApiQuery({ name: 'active', required: false, example: true })
  findAll(@Query() query: CurriculaQueryDto) {
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
  create(@Body() dto: CreateCurriculumDto) {
    return this.service.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id/specialization-area')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  linkSpecializationArea(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurriculumAreaDto,
  ) {
    return this.service.linkSpecializationArea(id, dto.specializationAreaId);
  }
}
