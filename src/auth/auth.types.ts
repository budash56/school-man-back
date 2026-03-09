import { Users } from '../users/users.entity';

export type Role = Users['role'];

export type SanitizedUser = {
  nationalId: string;
  username: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  mustChangePassword: boolean;
};

export type AuthResponse = {
  accessToken: string;
  user: SanitizedUser;
};
