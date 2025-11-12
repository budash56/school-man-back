import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsAbsenceMonitorService } from './absence-monitor.service';
import { Logger } from '@nestjs/common';

@ApiTags('notifications')
@Roles('admin', 'coordinator')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);
  constructor(
    private readonly service: NotificationsService,
    private readonly absenceMonitor: NotificationsAbsenceMonitorService,
  ) {}

  @Get()
  findAll(@Query() query: QueryNotificationDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiBody({
    type: CreateNotificationDto,
    examples: {
      default: {
        summary: 'Create notification',
        value: {
          title: 'Attendance Alert',
          message: 'Student John Doe absent today',
          isActive: true,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateNotificationDto) {
    return this.service.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiBody({
    type: UpdateNotificationDto,
    examples: {
      default: {
        summary: 'Update notification status',
        value: {
          isActive: false,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificationDto,
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

  @Roles('admin', 'coordinator')
  @Patch(':id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number) {
    return this.service.resolve(id);
  }

  @Roles('admin', 'coordinator')
  @Post('suggestions/absence/run')
  @HttpCode(HttpStatus.CREATED)
  async runAbsence(@Query('date') date: string) {
  try {
      const created = await this.absenceMonitor.run(date);
      this.logger.debug(`absence-run ok: date=${date} created=${created}`);
      return { created };
    } catch (e) {
      this.logger.error(`absence-run failed: date=${date}`, (e as any)?.stack ?? String(e));
      throw e;
    }
  }
}

