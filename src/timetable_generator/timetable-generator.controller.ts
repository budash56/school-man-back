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
  @ApiBody({ type: GenerateTimetableDto })
  preview(@Body() dto: GenerateTimetableDto): Promise<GenerationPreviewDto> {
    return this.service.preview(dto);
  }

  @Post('apply')
  @ApiOperation({
    summary:
      'Generate assignments and persist them via the timetable assignments service',
  })
  @ApiBody({ type: GenerateTimetableDto })
  apply(
    @Body() dto: GenerateTimetableDto,
    @CurrentUser() user?: SanitizedUser,
  ): Promise<GenerationApplyResultDto> {
    return this.service.apply(dto, user);
  }
}
