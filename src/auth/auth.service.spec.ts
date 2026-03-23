import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { EmailService } from '../email/email.service';
import { SignupDto } from './dto/signup.dto';
import type { SanitizedUser } from './auth.types';

type MockedUsersRepository = Partial<Record<keyof UsersRepository, jest.Mock>>;

describe('AuthService', () => {
  let service: AuthService;
  let usersRepo: UsersRepository & MockedUsersRepository;
  let jwtService: JwtService & { sign: jest.Mock };
  let emailService: EmailService & {
    sendWelcomeEmail: jest.Mock;
  };

  const baseSignupDto: SignupDto = {
    nationalId: '900100',
    password: 'Admin#123',
    username: 'new.user',
    role: 'teacher',
    firstName: 'Maria',
    lastName: 'Lopez',
    email: 'maria.lopez@example.edu',
    phone: '+57 3001234567',
  };

  const adminUser: SanitizedUser = {
    nationalId: '800001',
    username: 'admin.user',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.edu',
    phone: null,
    mustChangePassword: false,
  };

  const coordinatorUser: SanitizedUser = {
    nationalId: '800002',
    username: 'coord.user',
    role: 'coordinator',
    firstName: 'Coord',
    lastName: 'User',
    email: 'coord@example.edu',
    phone: null,
    mustChangePassword: false,
  };

  beforeEach(() => {
    usersRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockImplementation((payload) => payload),
      save: jest.fn().mockImplementation(async (entity) => ({
        isActive: true,
        mustChangePassword: false,
        ...entity,
      })),
    } as unknown as UsersRepository & MockedUsersRepository;

    jwtService = {
      sign: jest.fn().mockReturnValue('token'),
    } as unknown as JwtService & { sign: jest.Mock };

    emailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    } as unknown as EmailService & {
      sendWelcomeEmail: jest.Mock;
    };

    service = new AuthService(jwtService, usersRepo, emailService);
  });

  it('preserves registrar when created by an admin', async () => {
    const result = await service.signup(
      {
        ...baseSignupDto,
        role: 'registrar',
      },
      adminUser,
    );

    expect(usersRepo.create as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'registrar' }),
    );
    expect(result.user.role).toBe('registrar');
  });

  it('preserves registrar when created by a coordinator', async () => {
    const result = await service.signup(
      {
        ...baseSignupDto,
        role: 'registrar',
      },
      coordinatorUser,
    );

    expect(usersRepo.create as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'registrar' }),
    );
    expect(result.user.role).toBe('registrar');
  });

  it('rejects coordinators trying to create coordinators', async () => {
    await expect(
      service.signup(
        {
          ...baseSignupDto,
          role: 'coordinator',
        },
        coordinatorUser,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bootstraps the first admin when no admins exist', async () => {
    (usersRepo.count as jest.Mock).mockResolvedValue(0);

    const result = await service.signup({
      ...baseSignupDto,
      role: 'admin',
    });

    expect(result.user.role).toBe('admin');
  });
});
