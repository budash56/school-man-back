import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TimetableImportService } from './timetable-import.service';

@ApiTags('timetable-import')
@Roles('admin', 'coordinator')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timetable/import')
export class TimetableImportController {
  constructor(private readonly service: TimetableImportService) {}

  @Post('confirm')
  confirmImport(@Body() body: unknown) {
    return this.service.confirmImport(body);
  }
}
