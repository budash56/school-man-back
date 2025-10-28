// Provides CRUD endpoints for class-groups using the generated ClassGroups entity.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';
import { ClassGroupsService } from './class_groups.service';

@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('class-groups')
export class ClassGroupsController {
  constructor(private readonly service: ClassGroupsService) {}

  @Get()
  findAll() {
    return this.service.findAll({});
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
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
          section: 'A1',
          defaultClassroomId: 3,
        },
      },
    },
  })
  create(@Body() dto: CreateClassGroupDto) {
    return this.service.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiBody({
    type: UpdateClassGroupDto,
    examples: {
      default: {
        summary: 'Update class group section',
        value: {
          section: 'A2',
        },
      },
    },
  })
  update(@Param('id') id: string, @Body() dto: UpdateClassGroupDto) {
    return this.service.update(Number(id), dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(Number(id));
    return { deleted: true };
  }
}
