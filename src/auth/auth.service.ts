// Handles credential validation and JWT token issuance for the authentication workflow.
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Users } from '../users/users.entity';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthResponse, SanitizedUser } from './auth.types';
export type { AuthResponse, SanitizedUser } from './auth.types';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersRepo: UsersRepository,
    private readonly emailService: EmailService,
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
    await this.sendWelcomeIfTeacher(createdUser, dto.password, requestingUser);
    return this.buildAuthResponse(createdUser);
  }

  async changePassword(
    currentUser: SanitizedUser,
    dto: ChangePasswordDto,
  ): Promise<{ updated: true }> {
    const user = await this.usersRepo.findOne({
      where: { nationalId: currentUser.nationalId },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña actual inválida');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.mustChangePassword = false;
    user.tempPasswordIssuedAt = null;
    user.updatedAt = new Date();

    await this.usersRepo.save(user);
    return { updated: true };
  }

  async updateProfile(
    currentUser: SanitizedUser,
    dto: UpdateProfileDto,
  ): Promise<SanitizedUser> {
    const user = await this.usersRepo.findOne({
      where: { nationalId: currentUser.nationalId },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (dto.email !== undefined) {
      user.email = dto.email?.trim() || null;
    }
    user.updatedAt = new Date();

    const saved = await this.usersRepo.save(user);
    return this.sanitizeUser(saved);
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
    const nextRole = requestedRole ?? 'teacher';

    if (requestingUser?.role === 'admin') {
      return nextRole;
    }

    if (requestingUser?.role === 'coordinator') {
      if (nextRole === 'teacher' || nextRole === 'registrar') {
        return nextRole;
      }

      throw new ForbiddenException(
        'Coordinators can only create teacher or registrar users',
      );
    }

    if (requestingUser) {
      throw new ForbiddenException(
        'Only admins or coordinators can create users',
      );
    }

    if (nextRole === 'admin') {
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
      mustChangePassword: user.mustChangePassword,
    };
  }

  private async sendWelcomeIfTeacher(
    user: Users,
    temporaryPassword: string,
    requestingUser?: SanitizedUser,
  ) {
    if (user.role !== 'teacher' || !user.email) {
      return;
    }

    const coordinatorName = this.formatCoordinatorName(requestingUser);
    try {
      await this.emailService.sendWelcomeEmail({
        recipientEmail: user.email,
        recipientName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username,
        nationalId: user.nationalId,
        temporaryPassword,
        coordinatorName,
        schoolName: this.emailService.getSchoolName(),
      });
    } catch (error) {
      // Do not block user creation if email fails
      this.logger.error('Failed to send welcome email', error instanceof Error ? error.stack : undefined);
    }
  }

  private formatCoordinatorName(user?: SanitizedUser): string {
    if (!user) {
      return 'Coordinación';
    }
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return name || user.username;
  }
}
