import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateClassGroupClassroomDto {
  @ApiProperty({
    example: 12,
    description: 'Classroom identifier for the class group',
  })
  @IsInt()
  @Min(1)
  classroomId: number;

  @ApiPropertyOptional({
    example: true,
    description:
      'When true, update the fixed location mapping for this grade/section',
  })
  @IsOptional()
  @IsBoolean()
  fixedLocation?: boolean;
}
