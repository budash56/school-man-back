import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class TeacherSubjectsQueryDto {
  @ApiPropertyOptional({
    example: '199001011234',
    description: 'Filter by teacher national ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  teacherId?: string;

  @ApiPropertyOptional({
    example: 12,
    description: 'Filter by subject identifier',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsOptional()
  @IsInt()
  @IsPositive()
  subjectId?: number;
}
