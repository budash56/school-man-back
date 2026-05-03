import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles, WRITE_ROLES } from '../auth/roles.decorator';
import { ScannerService } from './scanner.service';

@ApiTags('scanner')
@Roles(...WRITE_ROLES)
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scanner')
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('planilla')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  scanPlanilla(@UploadedFile() file: Express.Multer.File) {
    return this.scannerService.scanPlanilla(file);
  }

  @Post('timetable')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  scanTimetable(@UploadedFile() file: Express.Multer.File) {
    return this.scannerService.scanTimetable(file);
  }

  @Post('curriculum-schedule')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  scanCurriculumSchedule(@UploadedFile() file: Express.Multer.File) {
    return this.scannerService.scanCurriculumSchedule(file);
  }
}
