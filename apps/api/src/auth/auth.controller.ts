import { Body, Controller, Get, HttpCode, Ip, Post, Res, UseGuards } from '@nestjs/common';
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
import { TurnstileService } from './turnstile.service';

const SECURE = process.env.NODE_ENV === 'production' || (process.env.WEB_ORIGIN ?? '').startsWith('https://');
const SAME_SITE: 'lax' | 'none' = SECURE ? 'none' : 'lax';
const COOKIE_BASE = { httpOnly: true, sameSite: SAME_SITE, secure: SECURE, path: '/' };
const COOKIE_OPTS = { ...COOKIE_BASE, maxAge: 7 * 24 * 60 * 60 * 1000 };

@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly turnstile: TurnstileService) {}

  // 5 new accounts per 15 minutes from one address.
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    await this.turnstile.verify(dto.captchaToken, ip);
    const { token, user } = await this.auth.register(dto);
    res.cookie('token', token, COOKIE_OPTS);
    return { ...user, token };
  }

  // 10 sign-in attempts per 15 minutes for one email from one address.
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    await this.turnstile.verify(dto.captchaToken, ip);
    const { token, user } = await this.auth.login(dto);
    res.cookie('token', token, COOKIE_OPTS);
    return { ...user, token };
  }

  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Ip() ip: string) {
    await this.turnstile.verify(dto.captchaToken, ip);
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
