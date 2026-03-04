import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBuildingDto {
  @ApiProperty({
    example: 'Bloque A',
    description: 'Building name',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: false, description: 'Mark building as lab' })
  @IsOptional()
  @IsBoolean()
  isLab?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Mark building as auditorium',
  })
  @IsOptional()
  @IsBoolean()
  isAuditorium?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Mark building as computer room',
  })
  @IsOptional()
  @IsBoolean()
  isComputerRoom?: boolean;
}
