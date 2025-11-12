import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min, IsString } from 'class-validator';

export class TeacherWorkloadQueryDto {
  @ApiProperty({ example: '800001', description: 'Teacher national ID' })
  @IsString()
  teacherId: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Optional week offset (0=current week, -1=previous)',
  })
  @Type(() => Number)
  @IsInt()
  weekOffset = 0;
}
