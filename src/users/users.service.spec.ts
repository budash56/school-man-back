import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { EmailService } from '../email/email.service';
import { UpdateUsersDto } from './dto/update-users.dto';
import type { SanitizedUser } from '../auth/auth.types';

type MockedUsersRepository = Partial<Record<keyof UsersRepository, jest.Mock>>;

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository & MockedUsersRepository;
  let emailService: EmailService;

  const existingUser = {
    nationalId: '900100',
    username: 'user.one',
    passwordHash: 'hash',
    role: 'teacher',
    firstName: 'Maria',
    lastName: 'Lopez',
    email: 'maria@example.edu',
    phone: null,
    isActive: true,
    mustChangePassword: false,
    tempPasswordIssuedAt: null,
    updatedAt: new Date(),
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
    repository = {
      findOne: jest.fn().mockResolvedValue({ ...existingUser }),
      save: jest.fn().mockImplementation(async (entity) => entity),
    } as unknown as UsersRepository & MockedUsersRepository;

    emailService = {} as EmailService;
    service = new UsersService(repository, emailService);
  });

  it('allows admins to change user roles', async () => {
    const dto: UpdateUsersDto = { role: 'registrar' };

    const result = await service.update(existingUser.nationalId, dto, adminUser);

    expect(repository.save as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'registrar' }),
    );
    expect(result.role).toBe('registrar');
  });

  it('rejects non-admin role changes', async () => {
    const dto: UpdateUsersDto = { role: 'registrar' };

    await expect(
      service.update(existingUser.nationalId, dto, coordinatorUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
