import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 'CC-1234567' })
  nationalId: string;

  @ApiProperty({ example: 'jdoe' })
  username: string;

  @ApiProperty({ example: 'teacher', enum: ['admin', 'coordinator', 'registrar', 'teacher'] })
  role: string;

  @ApiProperty({ example: 'Juana' })
  firstName: string | null;

  @ApiProperty({ example: 'García' })
  lastName: string | null;

  @ApiProperty({ example: 'juana@example.edu', nullable: true })
  email: string | null;

  @ApiProperty({ example: '+57 3001234567', nullable: true })
  phone: string | null;

  @ApiProperty({ example: false })
  mustChangePassword: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Signed JWT bearer token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
