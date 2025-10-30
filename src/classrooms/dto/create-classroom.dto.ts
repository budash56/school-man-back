import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateClassroomDto {
  @ApiProperty({ example: 'Room 101', description: 'Unique classroom name' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: 'Main Building', description: 'Building where the classroom is located' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  building?: string;

  @ApiProperty({ example: 30, description: 'Maximum capacity of the classroom' })
  @IsInt()
  @Min(0)
  capacity: number;
}
