import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type AppRole = 'admin' | 'coordinator' | 'registrar' | 'teacher';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

export const ALL_ROLES: readonly AppRole[] = ['admin', 'coordinator', 'registrar', 'teacher'];
export const READ_ROLES: readonly AppRole[] = ALL_ROLES;
export const WRITE_ROLES: readonly AppRole[] = ['admin', 'coordinator'];
export const ATTENDANCE_MUTATE_ROLES: readonly AppRole[] = ['admin', 'coordinator', 'teacher'];
export const ATTENDANCE_DELETE_ROLES: readonly AppRole[] = ['admin', 'coordinator'];
export const GRADE_MUTATE_ROLES: readonly AppRole[] = ['admin', 'teacher'];
