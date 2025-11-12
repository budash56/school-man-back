import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, MaxLength } from 'class-validator';

export class UpdateGradeDto {
  @ApiPropertyOptional({
    description: 'Updated numeric mark for the student (5=S, 4=A, 3=B, 1=J)',
    example: 3,
    enum: [5, 4, 3, 1],
  })
  @IsOptional()
  @IsInt()
  @IsIn([5, 4, 3, 1])
  mark?: 5 | 4 | 3 | 1;

  @ApiPropertyOptional({
    description: 'Updated comment for the grade',
    example: 'Improved after remedial sessions.',
    maxLength: 500,
  })
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
