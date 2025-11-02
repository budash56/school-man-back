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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { SchoolYearsQueryDto } from './dto/school-years-query.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { SchoolYearsService } from './school_years.service';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('school-years')
@Roles(...READ_ROLES)
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('school-years')
export class SchoolYearsController {
  constructor(private readonly service: SchoolYearsService) {}

  @Get()
  @ApiQuery({ name: 'active', required: false, example: true })
  @ApiQuery({ name: 'name', required: false, example: '2025' })
  findAll(@Query() query: SchoolYearsQueryDto) {
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
  create(@Body() dto: CreateSchoolYearDto) {
    return this.service.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSchoolYearDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('rollover')
  @Roles('admin')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin',
  })
  rollover(
    @Body() dto: { name?: string; startDate: string; endDate: string },
    @Req() req: { user: { role: string } },
  ) {
    return this.service.rollover(dto, req.user);
  }

  @Post(':id/lock')
  @Roles('admin')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin',
  })
  lock(@Param('id', ParseIntPipe) id: number, @Req() req: { user: { role: string } }) {
    return this.service.lock(id, req.user);
  }
}
