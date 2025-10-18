import { IsIn, IsOptional, MaxLength } from 'class-validator';

export class UpdateGradeDto {
  @IsOptional()
  @IsIn(['S', 'A', 'B', 'J'])
  mark?: 'S' | 'A' | 'B' | 'J';

  @IsOptional()
  @MaxLength(500)
  comment?: string;
}
