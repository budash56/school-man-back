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
    description: 'Numeric mark assigned to the student (5=S, 4=A, 3=B, 1=J)',
    example: 4,
    enum: [5, 4, 3, 1],
  })
  @IsInt()
  @IsIn([5, 4, 3, 1])
  mark: 5 | 4 | 3 | 1;

  @ApiPropertyOptional({
    description: 'Optional comment that accompanies the grade',
    example: 'Demonstrated excellent understanding of the material.',
    maxLength: 500,
  })
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
