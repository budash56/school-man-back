import { SetMetadata } from '@nestjs/common';
import type { Role } from './auth.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ALL_ROLES: readonly Role[] = ['admin', 'coordinator', 'registrar', 'teacher'];
export const READ_ROLES: readonly Role[] = ALL_ROLES;
export const WRITE_ROLES: readonly Role[] = ['admin', 'coordinator'];
export const ATTENDANCE_MUTATE_ROLES: readonly Role[] = ['admin', 'coordinator', 'teacher'];
export const ATTENDANCE_DELETE_ROLES: readonly Role[] = ['admin', 'coordinator'];
export const GRADE_MUTATE_ROLES: readonly Role[] = ['admin', 'teacher'];
