// Provides CRUD endpoints for terms using the generated Terms entity.
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
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermsQueryDto } from './dto/terms-query.dto';
import { TermsService } from './terms.service';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('terms')
@Roles(...READ_ROLES)
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('terms')
export class TermsController {
  constructor(private readonly termsService: TermsService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false, example: true })
  @ApiQuery({ name: 'name', required: false, example: 'P1' })
  @ApiQuery({ name: 'schoolYearId', required: false, example: 1 })
  findAll(@Query() query: TermsQueryDto) {
    return this.termsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.termsService.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateTermDto) {
    return this.termsService.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTermDto) {
    return this.termsService.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.termsService.remove(id);
  }
}
