import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsString, Matches } from 'class-validator';

export class CreateSchoolYearDto {
  @ApiProperty({
    example: '2025',
    description: 'Unique four-digit year identifier such as 2025',
  })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'name must be a four digit year value' })
  name: string;

  @ApiProperty({
    example: '2025-08-15',
    description: 'First day of the school year',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-06-15',
    description: 'Last day of the school year',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    example: true,
    description:
      'Marks the school year as active for enrollment and scheduling',
  })
  @IsBoolean()
  active: boolean;
}
