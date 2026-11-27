import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './roles.guard';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user;
});

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
