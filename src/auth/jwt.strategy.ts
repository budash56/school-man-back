// Validates JWT access tokens and attaches the current user to incoming requests.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from '../users/Users.entity';
import type { SanitizedUser } from './auth.service';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Users['role'];
  jti?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepo: Repository<Users>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'change-me',
    });
  }

  async validate(payload: JwtPayload): Promise<SanitizedUser> {
    const user = await this.usersRepo.findOne({
      where: { nationalId: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is not authorized to access this resource');
    }

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
