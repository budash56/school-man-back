import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CALENDAR_EVENT_CATEGORIES,
  CALENDAR_EVENT_VISIBILITY_SCOPES,
} from '../calendar-events.constants';

export class CreateCalendarEventDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  schoolYearId: number;

  @ApiProperty({ example: 'Reunión con padres de familia' })
  @IsString()
  @MaxLength(160)
  title: string;

  @ApiPropertyOptional({
    example: 'Revisar avances del segundo periodo con todos los docentes.',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ enum: CALENDAR_EVENT_CATEGORIES, example: 'communication' })
  @IsIn(CALENDAR_EVENT_CATEGORIES)
  category: (typeof CALENDAR_EVENT_CATEGORIES)[number];

  @ApiProperty({ example: 'meeting' })
  @IsString()
  @MaxLength(40)
  kind: string;

  @ApiProperty({ example: '2026-03-25' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-25' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    enum: CALENDAR_EVENT_VISIBILITY_SCOPES,
    example: 'selected_teachers',
  })
  @IsOptional()
  @IsIn(CALENDAR_EVENT_VISIBILITY_SCOPES)
  visibilityScope?: (typeof CALENDAR_EVENT_VISIBILITY_SCOPES)[number];

  @ApiPropertyOptional({ type: [String], example: ['100349335', '1122334455'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetTeacherIds?: string[];

  @ApiPropertyOptional({ type: [Number], example: [2, 5] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  targetAreaIds?: number[];

  @ApiPropertyOptional({ type: [Number], example: [8, 13] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  targetClassGroupIds?: number[];
}
