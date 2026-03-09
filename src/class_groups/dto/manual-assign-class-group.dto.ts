import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class ManualAssignClassGroupDto {
  @ApiProperty({ example: 1, description: 'School year identifier' })
  @IsInt()
  @Min(1)
  schoolYearId: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 11 })
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel: number;

  @ApiProperty({
    example: '01',
    description: 'Section code (01-09)',
  })
  @Matches(/^0[1-9]$/)
  section: string;

  @ApiProperty({ example: 12, description: 'Classroom identifier' })
  @IsInt()
  @Min(1)
  classroomId: number;

  @ApiProperty({
    example: [101, 102, 103],
    description: 'Enrollment identifiers to assign',
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  enrollmentIds: number[];

  @ApiPropertyOptional({
    example: false,
    description: 'Persist this classroom as fixed for grade/section',
  })
  @IsOptional()
  @IsBoolean()
  fixedLocation?: boolean;
}
