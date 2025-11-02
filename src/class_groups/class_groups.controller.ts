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
import { ApiBearerAuth, ApiBody, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';
import { QueryClassGroupDto } from './dto/query-class-group.dto';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';
import { ClassGroupsService } from './class_groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('class-groups')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('class-groups')
export class ClassGroupsController {
  constructor(private readonly service: ClassGroupsService) {}

  @Get()
  async findAll(@Query() query: QueryClassGroupDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiBody({
    type: CreateClassGroupDto,
    examples: {
      default: {
        summary: 'Create class group',
        value: {
          schoolYearId: 1,
          gradeLevel: 10,
          section: '01',
          defaultClassroomId: 3,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  async create(@Body() dto: CreateClassGroupDto) {
    return this.service.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiBody({
    type: UpdateClassGroupDto,
    examples: {
      default: {
        summary: 'Update class group',
        value: {
          gradeLevel: 11,
          section: '02',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassGroupDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { deleted: true };
  }
}
