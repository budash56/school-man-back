import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateClassGroupCurriculumOverrideDto {
  @ApiProperty({
    example: 20,
    description: 'Identifier of the class group to override',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsInt()
  @IsPositive()
  classGroupId: number;

  @ApiProperty({
    example: 55,
    description: 'Identifier of the curriculum item being overridden',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsInt()
  @IsPositive()
  curriculumItemId: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Override weekly hours for the class group',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  weeklyHoursOverride?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Override double session requirement',
  })
  @IsOptional()
  @IsBoolean()
  doubleSessionOverride?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Disable this subject for the class group',
  })
  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;
}
