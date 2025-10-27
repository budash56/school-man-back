import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { SanitizedUser } from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SanitizedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: SanitizedUser }>();
    return request.user;
  },
);
