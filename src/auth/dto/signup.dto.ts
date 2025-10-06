// Describes the minimum data needed to register a new platform user.
export class SignupDto {
  nationalId: string;
  username: string;
  password: string;
  role?: 'admin' | 'registrar' | 'teacher' | 'coordinator';
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}
