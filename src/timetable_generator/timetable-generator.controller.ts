import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UseGuards } from '@nestjs/common';
import { TimetableGeneratorService } from './timetable-generator.service';
import { GenerateTimetableDto } from './dto/generate-timetable.dto';
import {
  GenerationApplyResultDto,
  GenerationPreviewDto,
} from './dto/generation-result.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { SanitizedUser } from '../auth/auth.types';

const exampleGeneratePayload: GenerateTimetableDto = {
  schoolYearId: 2026,
  division: 'secondary',
  teacherWeeklyHourCap: 18,
  balanceAcrossDays: true,
  avoidConsecutiveSameSubject: true,
  maxSessionsPerDayDefault: 1,
  minGapSlotsDefault: 1,
  teacherConstraints: [
    {
      teacherId: '900100',
      preferredShift: 'morning',
      avoidLastSlot: true,
    },
  ],
  coursePreferences: [
    {
      courseId: 1201,
      sessionsPerWeek: 4,
      blockLength: 1,
      maxSessionsPerDay: 1,
      minGapSlots: 1,
    },
    {
      courseId: 1202,
      sessionsPerWeek: 2,
      blockLength: 2,
      allowDoubleBlock: true,
      targetDays: [1, 3, 5],
    },
  ],
  blockedSlots: [
    {
      dayOfWeek: 1,
      startTime: '10:50:00',
      endTime: '11:20:00',
    },
  ],
};

@ApiTags('timetable-generator')
@ApiBearerAuth('bearer')
@Roles('admin', 'coordinator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timetable-generator')
export class TimetableGeneratorController {
  constructor(private readonly service: TimetableGeneratorService) {}

  @Post('preview')
  @ApiOperation({
    summary: 'Preview generated timetable assignments without persisting them',
  })
  @ApiBody({
    type: GenerateTimetableDto,
    examples: {
      default: {
        summary: 'Balanced preview request',
        value: exampleGeneratePayload,
      },
    },
  })
  preview(@Body() dto: GenerateTimetableDto): Promise<GenerationPreviewDto> {
    return this.service.preview(dto);
  }

  @Post('apply')
  @ApiOperation({
    summary:
      'Generate assignments and persist them via the timetable assignments service',
  })
  @ApiBody({
    type: GenerateTimetableDto,
    examples: {
      default: {
        summary: 'Balanced apply request',
        value: exampleGeneratePayload,
      },
    },
  })
  apply(
    @Body() dto: GenerateTimetableDto,
    @CurrentUser() user?: SanitizedUser,
  ): Promise<GenerationApplyResultDto> {
    return this.service.apply(dto, user);
  }
}
