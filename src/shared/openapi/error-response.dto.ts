import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code associated with the error',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Short human-readable description of the error',
    example: 'Bad Request',
  })
  error: string;

  @ApiPropertyOptional({
    description: 'Detailed error message',
    example: 'Validation failed for request body',
  })
  message?: string | string[];

  @ApiPropertyOptional({
    description: 'Timestamp ISO string indicating when the error occurred',
    example: '2025-01-01T12:00:00.000Z',
    format: 'date-time',
  })
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Request path that resulted in the error',
    example: '/attendance',
  })
  path?: string;
}
