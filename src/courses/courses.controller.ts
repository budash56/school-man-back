import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesQueryDto } from './dto/courses-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Request } from 'express';

type ActingUser = {
  userId: number;
  role: string;
};

type RequestWithUser = Request & {
  user?: { userId?: number; nationalId?: string; role?: string };
};

@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll(@Query() query: CoursesQueryDto, @Req() req: RequestWithUser) {
    return this.coursesService.findAll(query, this.toActingUser(req));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiBody({
    type: CreateCourseDto,
    examples: {
      default: {
        summary: 'Assign teacher to class group',
        value: {
          courseInstanceId: 4,
          classGroupId: 10,
          teacherId: 'teacher-001',
        },
      },
    },
  })
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiBody({
    type: UpdateCourseDto,
    examples: {
      default: {
        summary: 'Reassign teacher',
        value: {
          teacherId: 'teacher-007',
        },
      },
    },
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.remove(id);
  }

  private toActingUser(req: RequestWithUser): ActingUser | undefined {
    if (!req.user) {
      return undefined;
    }
    const rawId = req.user.userId ?? (req.user.nationalId ? Number(req.user.nationalId) : NaN);
    return {
      userId: Number.isFinite(rawId) ? Number(rawId) : 0,
      role: req.user.role ?? 'teacher',
    };
  }
}
