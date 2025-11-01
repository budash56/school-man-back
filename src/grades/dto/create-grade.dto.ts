import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateGradeDto {
  @ApiProperty({
    description: 'Identifier of the student receiving the grade',
    example: 301,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({
    description: 'Identifier of the course in which the grade is recorded',
    example: 410,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiProperty({
    description: 'Identifier of the term linked to the grade',
    example: 12,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  termId: number;

  @ApiProperty({
    description: 'Letter mark assigned to the student',
    example: 'A',
    enum: ['S', 'A', 'B', 'J'],
  })
  @IsIn(['S', 'A', 'B', 'J'])
  mark: 'S' | 'A' | 'B' | 'J';

  @ApiPropertyOptional({
    description: 'Optional comment that accompanies the grade',
    example: 'Demonstrated excellent understanding of the material.',
    maxLength: 500,
  })
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
