import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, MaxLength } from 'class-validator';

export class UpdateGradeDto {
  @ApiPropertyOptional({
    description: 'Updated letter mark for the student',
    example: 'B',
    enum: ['S', 'A', 'B', 'J'],
  })
  @IsOptional()
  @IsIn(['S', 'A', 'B', 'J'])
  mark?: 'S' | 'A' | 'B' | 'J';

  @ApiPropertyOptional({
    description: 'Updated comment for the grade',
    example: 'Improved after remedial sessions.',
    maxLength: 500,
  })
  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
