// Provides endpoints for managing curriculum items.
import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { CurriculumItemsService } from './curriculum_items.service';
import { CreateCurriculumItemDto } from './dto/create-curriculum-item.dto';
import { UpdateCurriculumItemDto } from './dto/update-curriculum-item.dto';

@ApiTags('curriculum-items')
@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('curriculum-items')
export class CurriculumItemsController {
  constructor(private readonly service: CurriculumItemsService) {}

  @Roles('admin')
  @Post()
  @ApiForbiddenResponse({ description: 'Forbidden: requires role admin' })
  create(@Body() dto: CreateCurriculumItemDto) {
    return this.service.create(dto);
  }

  @Roles('admin')
  @Patch(':id')
  @ApiForbiddenResponse({ description: 'Forbidden: requires role admin' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurriculumItemDto,
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
