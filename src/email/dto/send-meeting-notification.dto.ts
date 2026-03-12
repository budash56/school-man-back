import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  MinLength,
  IsEmail,
} from 'class-validator';

export class SendMeetingNotificationDto {
  @ApiProperty({
    example: ['prof1@example.com', 'prof2@example.com'],
    description: 'Recipient professor emails',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  recipientEmails: string[];

  @ApiProperty({ example: 'Reunión general de docentes' })
  @IsString()
  @MinLength(3)
  subject: string;

  @ApiProperty({ example: 'Reunión el viernes a las 3pm en sala de profesores.' })
  @IsString()
  @MinLength(3)
  message: string;

  @ApiProperty({ example: '2026-03-20 15:00', required: false })
  @IsOptional()
  @IsString()
  meetingDate?: string;
}
