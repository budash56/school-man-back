// Handles credential validation and JWT token issuance for the authentication workflow.
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Users } from '../users/users.entity';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import type { AuthResponse, SanitizedUser } from './auth.types';
export type { AuthResponse, SanitizedUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepo: UsersRepository,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(dto.nationalId, dto.password);
    return this.buildAuthResponse(user);
  }

  async signup(
    dto: SignupDto,
    requestingUser?: SanitizedUser,
  ): Promise<AuthResponse> {
    await this.assertNewUserIsUnique(dto);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const defaults: Partial<Users> = {
      isActive: true,
    };

    const role = await this.resolveSignupRole(dto.role, requestingUser);

    const entity = this.usersRepo.create({
      ...defaults,
      nationalId: dto.nationalId,
      username: dto.username ?? dto.nationalId,
      passwordHash,
      role,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
    });

    const createdUser = await this.usersRepo.save(entity);
    return this.buildAuthResponse(createdUser);
  }

  private async validateUser(
    nationalId: string,
    password: string,
  ): Promise<Users> {
    const user = await this.usersRepo.findOne({ where: { nationalId } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    return user;
  }

  private async assertNewUserIsUnique(dto: SignupDto): Promise<void> {
    const existingUser = await this.usersRepo.findOne({
      where: [
        { nationalId: dto.nationalId },
        ...(dto.username ? [{ username: dto.username }] : []),
      ],
    });

    if (existingUser) {
      throw new ConflictException(
        'A user with the provided identifiers already exists',
      );
    }
  }

  private async resolveSignupRole(
    requestedRole: SignupDto['role'],
    requestingUser?: SanitizedUser,
  ): Promise<Users['role']> {
    if (requestingUser?.role === 'admin') {
      return requestedRole ?? 'teacher';
    }
    if (requestedRole === 'admin') {
      const admins = await this.usersRepo.count({ where: { role: 'admin' } });
      if (admins === 0) {
        return 'admin';
      }
    }
    return 'teacher';
  }

  private buildAuthResponse(user: Users): AuthResponse {
    const payload = {
      sub: user.nationalId,
      username: user.username,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      jwtid: uuidv4(),
    });

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  private sanitizeUser(user: Users): SanitizedUser {
    return {
      nationalId: user.nationalId,
      username: user.username,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    };
  }
}
