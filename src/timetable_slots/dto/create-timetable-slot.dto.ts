import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Matches, Max, Min, IsOptional } from 'class-validator';

export class CreateTimetableSlotDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    maximum: 7,
    description: 'ISO day of week (1=Mon ... 7=Sun)',
  })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiProperty({ example: '08:00', description: 'Start time in HH:MM (24h)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:MM 24h format',
  })
  startTime: string;

  @ApiProperty({ example: '09:00', description: 'End time in HH:MM (24h)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be in HH:MM 24h format',
  })
  endTime: string;

  @ApiPropertyOptional({
    example: 60,
    description:
      'Optional duration override; defaults to the difference between endTime and startTime',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}
