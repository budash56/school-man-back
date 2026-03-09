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
  ApiBody,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import { QueryClassGroupDto } from './dto/query-class-group.dto';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';
import { AutoAssignClassGroupsDto } from './dto/auto-assign-class-groups.dto';
import { ManualAssignClassGroupDto } from './dto/manual-assign-class-group.dto';
import { UpdateClassGroupClassroomDto } from './dto/update-class-group-classroom.dto';
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
  @Post('manual-assign')
  @ApiBody({
    type: ManualAssignClassGroupDto,
    examples: {
      default: {
        summary: 'Create a class group and assign students manually',
        value: {
          schoolYearId: 2,
          gradeLevel: 4,
          section: '01',
          classroomId: 12,
          enrollmentIds: [101, 102, 103],
          fixedLocation: true,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  async manualAssign(@Body() dto: ManualAssignClassGroupDto) {
    return this.service.manualAssignSection(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id/classroom')
  @ApiBody({
    type: UpdateClassGroupClassroomDto,
    examples: {
      default: {
        summary: 'Update the classroom for an existing class group',
        value: {
          classroomId: 12,
          fixedLocation: true,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  async updateClassroom(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassGroupClassroomDto,
  ) {
    return this.service.updateClassroomAssignment(
      id,
      dto.classroomId,
      dto.fixedLocation,
    );
  }

  @Roles('admin', 'coordinator')
  @Post('auto-assign')
  @ApiBody({
    type: AutoAssignClassGroupsDto,
    examples: {
      default: {
        summary: 'Create sections and assign enrollments',
        value: {
          schoolYearId: 2,
          gradeLevel: 7,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  async autoAssign(@Body() dto: AutoAssignClassGroupsDto) {
    return this.service.autoAssignSections(dto);
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
