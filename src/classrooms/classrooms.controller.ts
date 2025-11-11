// Provides CRUD endpoints for classrooms using the generated Classrooms entity.
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
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ClassroomsService } from './classrooms.service';
import { QueryClassroomDto } from './dto/query-classroom.dto';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

@ApiTags('classrooms')
@Roles(...READ_ROLES)
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly service: ClassroomsService) {}

  @Get()
  findAll(@Query() query: QueryClassroomDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiBody({
    type: CreateClassroomDto,
    examples: {
      default: {
        summary: 'Create classroom',
        value: {
          name: 'Room 101',
          building: 'Main Building',
          capacity: 30,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateClassroomDto) {
    return this.service.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiBody({
    type: UpdateClassroomDto,
    examples: {
      default: {
        summary: 'Update classroom capacity',
        value: {
          capacity: 28,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassroomDto,
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
