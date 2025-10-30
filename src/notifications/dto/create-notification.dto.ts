import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Attendance Alert', description: 'Notification title' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional({ example: 'Student John Doe has been absent.', description: 'Notification message body' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({ example: true, description: 'Whether the notification is active' })
  @IsBoolean()
  isActive: boolean;
}
