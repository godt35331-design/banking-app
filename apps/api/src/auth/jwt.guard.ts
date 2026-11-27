import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/** Requests a frozen customer may still make (logging out, support, notifications, sending ID). */
const ALLOWED_WHEN_FROZEN = [
  /\/auth\/logout$/,
  /\/support\/messages(\/read)?$/,
  /\/notifications\/read$/,
  /\/kyc$/,
  /\/recovery\/cases\/[^/]+\/messages(\/read)?$/,
  /\/loans\/applications\/[^/]+\/messages(\/read)?$/,
];

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException();

    let payload: any;
    try {
      payload = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException();
    }

    // Account status is checked on every request, so an admin's lock/freeze applies immediately.
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { status: true, role: true } });
    if (!user) throw new UnauthorizedException();
    if (user.status === 'LOCKED') throw new UnauthorizedException('Account is locked');
    if (
      user.status === 'FROZEN' &&
      req.method !== 'GET' &&
      !ALLOWED_WHEN_FROZEN.some(r => r.test(req.path))
    ) {
      throw new ForbiddenException('Your account is frozen. Please contact support.');
    }

    // Use the current role from the database, not the one baked into the token.
    (req as any).user = { ...payload, role: user.role };
    return true;
  }

  private extractToken(req: Request): string | null {
    const cookie = req.cookies?.token;
    if (cookie) return cookie;

    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) return auth.slice(7);

    return null;
  }
}
