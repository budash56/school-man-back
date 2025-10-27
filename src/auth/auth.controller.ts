import { ApiBearerAuth } from '@nestjs/swagger';
// Exposes authentication endpoints for login, signup, and profile retrieval.
import { Body, Controller, Get, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthResponse, SanitizedUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { CurrentUser } from './current-user.decorator';
import { Public } from './public.decorator';

@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('signup')
  async signup(@Body() signupDto: SignupDto): Promise<AuthResponse> {
    return this.authService.signup(signupDto);
  }

  @Get('me')
  async me(@CurrentUser() user?: SanitizedUser): Promise<SanitizedUser> {
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
