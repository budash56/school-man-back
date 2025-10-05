// Describes the minimum data needed to register a new platform user.
export class SignupDto {
  nationalId: string;
  username: string;
  password: string;
  role?: 'teacher' | 'coordinator' | 'management';
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}
