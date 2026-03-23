import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers?: { authorization?: string | string[] };
    }>();
    const authorization = request.headers?.authorization;

    if (!authorization || (Array.isArray(authorization) && authorization.length === 0)) {
      return true;
    }

    return super.canActivate(context);
  }
}
