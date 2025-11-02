// Provides CRUD endpoints for audit-logs using the generated AuditLogs entity.
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
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuditLogsService } from './audit_logs.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';

@ApiTags('audit-logs')
@Roles('admin', 'coordinator')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  findAll(@Query() query: QueryAuditLogDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('admin', 'coordinator')
  @Post()
  @ApiBody({
    type: CreateAuditLogDto,
    examples: {
      default: {
        summary: 'Record audit log entry',
        value: {
          entityName: 'students',
          entityId: 42,
          action: 'UPDATE',
          payload: { before: { isActive: false }, after: { isActive: true } },
          performedBy: '900001',
          performedAt: '2025-01-15T14:30:00.000Z',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  create(@Body() dto: CreateAuditLogDto) {
    return this.service.create(dto);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  @ApiBody({
    type: UpdateAuditLogDto,
    examples: {
      default: {
        summary: 'Update audit log entry',
        value: {
          payload: { after: { isActive: false } },
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'Forbidden: requires role admin, coordinator',
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuditLogDto) {
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
