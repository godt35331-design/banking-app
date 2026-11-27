import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtGuard } from './jwt.guard';
import { AuthThrottlerGuard } from './auth-throttler.guard';
import { CurrentUser } from './decorators';

const SECURE = process.env.NODE_ENV === 'production' || (process.env.WEB_ORIGIN ?? '').startsWith('https://');
const SAME_SITE: 'lax' | 'none' = SECURE ? 'none' : 'lax';
const COOKIE_BASE = { httpOnly: true, sameSite: SAME_SITE, secure: SECURE, path: '/' };
const COOKIE_OPTS = { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000 };

@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 5 new accounts per 15 minutes from one address.
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.register(dto);
    res.cookie('token', token, COOKIE_OPTS);
    return user;
  }

  // 10 sign-in attempts per 15 minutes for one email from one address.
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto);
    res.cookie('token', token, COOKIE_OPTS);
    return user;
  }

  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @SkipThrottle()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', COOKIE_BASE);
    return { ok: true };
  }

  @SkipThrottle()
  @Get('me')
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: { sub: string }) {
    return this.auth.me(user.sub);
  }
}
