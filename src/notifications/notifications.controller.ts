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
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@ApiTags('notifications')
@Roles('admin', 'coordinator')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

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
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { deleted: true };
  }
}
