import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class CreateClassGroupDto {
  @ApiProperty({ example: 1, description: 'Existing school year identifier' })
  @IsInt()
  @Min(1)
  schoolYearId: number;

  @ApiProperty({ example: 10, description: 'Grade level (1-11)' })
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel: number;

  @ApiProperty({ example: '01', description: 'Two-digit section code' })
  @Matches(/^[0-9]{2}$/, {
    message: 'section must be exactly two digits',
  })
  section: string;

  @ApiPropertyOptional({ example: 3, description: 'Optional default classroom id' })
  @IsOptional()
  @IsInt()
  @Min(1)
  defaultClassroomId?: number;
}
