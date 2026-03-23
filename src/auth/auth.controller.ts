import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
// Exposes authentication endpoints for login, signup, and profile retrieval.
import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthResponse, SanitizedUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({
    description: 'Returns an access token and the sanitized user profile',
    type: AuthResponseDto,
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('signup')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBody({
    type: SignupDto,
    examples: {
      default: {
        summary: 'Create a new user',
        value: {
          nationalId: '900100',
          password: 'Admin#123',
          username: 'admin.user',
          role: 'admin',
          firstName: 'Maria',
          lastName: 'Lopez',
          email: 'maria.lopez@example.edu',
          phone: '+57 3001234567',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Creates a new user and returns access token + profile',
    type: AuthResponseDto,
  })
  async signup(
    @Body() signupDto: SignupDto,
    @CurrentUser() user?: SanitizedUser,
  ): Promise<AuthResponse> {
    return this.authService.signup(signupDto, user);
  }

  @Get('me')
  @ApiOkResponse({
    description: 'Returns the authenticated user',
    type: AuthUserDto,
  })
  async me(@CurrentUser() user?: SanitizedUser): Promise<SanitizedUser> {
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user, dto);
  }
}
