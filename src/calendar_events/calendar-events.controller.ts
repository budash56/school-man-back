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
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CalendarEventsService } from './calendar-events.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { CalendarEventsQueryDto } from './dto/calendar-events-query.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';

@ApiTags('calendar-events')
@Roles(...READ_ROLES)
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('calendar-events')
export class CalendarEventsController {
  constructor(private readonly service: CalendarEventsService) {}

  @Get()
  findAll(
    @Query() query: CalendarEventsQueryDto,
    @Req() req: { user: { nationalId: string; role: 'admin' | 'coordinator' | 'registrar' | 'teacher' } },
  ) {
    return this.service.findAll(query, req.user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { nationalId: string; role: 'admin' | 'coordinator' | 'registrar' | 'teacher' } },
  ) {
    return this.service.findOne(id, req.user);
  }

  @Roles('admin', 'coordinator', 'teacher')
  @Post()
  @ApiBody({ type: CreateCalendarEventDto })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator, teacher',
  })
  create(
    @Body() dto: CreateCalendarEventDto,
    @Req() req: { user: { nationalId: string; role: 'admin' | 'coordinator' | 'registrar' | 'teacher' } },
  ) {
    return this.service.create(dto, req.user);
  }

  @Roles('admin', 'coordinator', 'teacher')
  @Patch(':id')
  @ApiBody({ type: UpdateCalendarEventDto })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator, teacher',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCalendarEventDto,
    @Req() req: { user: { nationalId: string; role: 'admin' | 'coordinator' | 'registrar' | 'teacher' } },
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Roles('admin', 'coordinator', 'teacher')
  @Delete(':id')
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator, teacher',
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { nationalId: string; role: 'admin' | 'coordinator' | 'registrar' | 'teacher' } },
  ) {
    return this.service.remove(id, req.user);
  }
}
