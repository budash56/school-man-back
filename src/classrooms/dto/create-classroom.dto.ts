import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateClassroomDto {
  @ApiPropertyOptional({
    example: 'BuildingA_Aula01',
    description: 'Classroom name (auto-generated if omitted)',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiProperty({
    example: 1,
    description: 'Building id where the classroom is located',
  })
  @IsInt()
  @IsPositive()
  buildingId: number;

  @ApiProperty({
    example: 30,
    description: 'Maximum capacity of the classroom',
  })
  @IsInt()
  @Min(0)
  capacity: number;
}
