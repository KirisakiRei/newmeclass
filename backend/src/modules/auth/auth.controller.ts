import { Body, Controller, ForbiddenException, Get, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthAudience, Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthAudienceAccess } from 'src/common/auth/auth-audience.decorator';
import {
  clearAuthCookies,
  clearGoogleOauthCookies,
  issueAuthCookies,
  issueGoogleOauthCookies,
  issueStandaloneCsrfCookie,
  readAccessTokenFromCookies,
  readRefreshTokenFromCookies,
  validateCsrfRequest,
  validateTrustedOriginRequest,
} from 'src/common/auth/auth-cookie.utils';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { getDashboardFrontendBaseUrl, getPublicFrontendBaseUrl } from 'src/common/frontend-urls';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ClaimMitraInviteDto } from './dto/claim-mitra-invite.dto';
import { CreateBridgeTicketDto } from './dto/create-bridge-ticket.dto';
import { ExchangeBridgeTicketDto } from './dto/exchange-bridge-ticket.dto';
import { CompleteGoogleProfileDto } from './dto/complete-google-profile.dto';

const AUTH_RATE_LIMIT_TTL_MS = Number(process.env.AUTH_RATE_LIMIT_TTL || 60) * 1000;
const AUTH_REGISTER_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT_REGISTER_LIMIT || 20);
const AUTH_LOGIN_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT_LOGIN_LIMIT || 20);
const AUTH_ADMIN_LOGIN_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT_ADMIN_LOGIN_LIMIT || 8);
const AUTH_PASSWORD_RECOVERY_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT_PASSWORD_RECOVERY_LIMIT || 8);

const buildFrontendRedirect = (
  baseUrl: string,
  path: string,
  query: Request['query'],
) => {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, `${baseUrl}/`);

  for (const [key, rawValue] of Object.entries(query || {})) {
    if (Array.isArray(rawValue)) {
      rawValue
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .forEach((value) => url.searchParams.append(key, value));
      continue;
    }

    const value = String(rawValue || '').trim();
    if (!value) continue;
    url.searchParams.set(key, value);
  }

  return url.toString();
};

const applyAuthResponseCookies = (res: Response, payload: any) => {
  if (payload?.cookies) {
    issueAuthCookies(res, payload.cookies.audience, payload.cookies);
  }
  const nextPayload = { ...(payload || {}) };
  delete nextPayload.cookies;
  return nextPayload;
};

const assertTrustedMutationRequest = (req: Request) => {
  if (!validateTrustedOriginRequest(req)) {
    throw new ForbiddenException('AUTH_ORIGIN_INVALID');
  }
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: AUTH_REGISTER_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('register')
  register(@Body() body: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    return this.authService.register(body, Role.USER, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    }).then((payload) => applyAuthResponseCookies(res, payload));
  }

  @Get('register')
  registerRedirect(@Req() req: Request, @Res() res: Response) {
    return res.redirect(302, buildFrontendRedirect(getPublicFrontendBaseUrl(), '/register', req.query));
  }

  @Throttle({ default: { limit: AUTH_LOGIN_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    return this.authService.login(body, Role.USER, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    }).then((payload) => applyAuthResponseCookies(res, payload));
  }

  @AuthAudienceAccess(AuthAudience.USER)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub, user.sid, AuthAudience.USER);
  }

  @Get('session')
  session(@Req() req: Request) {
    return this.authService.getSessionStateFromAccessToken(
      readAccessTokenFromCookies(req, AuthAudience.USER),
      AuthAudience.USER,
    );
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    const refreshToken = readRefreshTokenFromCookies(req, AuthAudience.USER);
    return this.authService.refreshSessionByRefreshToken(AuthAudience.USER, refreshToken)
      .then((payload) => applyAuthResponseCookies(res, payload));
  }

  @AuthAudienceAccess(AuthAudience.USER)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    clearAuthCookies(res, AuthAudience.USER);
    issueStandaloneCsrfCookie(res);
    return this.authService.logout(user.sub, user.sid, AuthAudience.USER);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post('bridge-ticket')
  createBridgeTicket(@CurrentUser() user: any, @Body() body: CreateBridgeTicketDto, @Req() req: Request) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    return this.authService.createBridgeTicket(user.sub, user.sid, body.target, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }

  @Post('bridge-exchange')
  exchangeBridgeTicket(@Body() body: ExchangeBridgeTicketDto, @Req() req: Request) {
    assertTrustedMutationRequest(req);
    return this.authService.exchangeBridgeTicket(body.ticket, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  updateProfile(@CurrentUser() user: any, @Req() req: Request, @Body() body: UpdateProfileDto) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    return this.authService.updateProfile(user.sub, body);
  }

  @AuthAudienceAccess(AuthAudience.USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post('google/complete-profile')
  completeGoogleProfile(@CurrentUser() user: any, @Req() req: Request, @Body() body: CompleteGoogleProfileDto) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    return this.authService.completeGoogleProfile(user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  changePassword(@CurrentUser() user: any, @Req() req: Request, @Body() body: ChangePasswordDto) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    return this.authService.changePassword(user.sub, body);
  }

  @Throttle({ default: { limit: AUTH_PASSWORD_RECOVERY_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request) {
    assertTrustedMutationRequest(req);
    return this.authService.forgotPassword(body.email, Role.USER);
  }

  @Throttle({ default: { limit: AUTH_PASSWORD_RECOVERY_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto, @Req() req: Request) {
    assertTrustedMutationRequest(req);
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('referral-link')
  referralLink(@CurrentUser() user: any) {
    return this.authService.getReferralLink(user.sub);
  }

  @Get('google/start')
  googleStart(
    @Query('intent') intent: string,
    @Query('target') target: string,
    @Query('ref') ref: string,
    @Res() res: Response,
  ) {
    const payload = this.authService.buildGoogleOauthStartUrl({
      intent,
      target,
      referralCode: ref,
    });
    issueGoogleOauthCookies(res, payload);
    return res.redirect(302, payload.redirectUrl);
  }

  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const payload = await this.authService.handleGoogleCallback({
      code: String(req.query.code || '').trim(),
      state: String(req.query.state || '').trim(),
      error: String(req.query.error || '').trim(),
      expectedState: req.cookies?.nm_google_oauth_state,
      encodedContext: req.cookies?.nm_google_oauth_ctx,
      auditMeta: {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });
    clearGoogleOauthCookies(res);
    if (payload?.cookies) {
      issueAuthCookies(res, payload.cookies.audience, payload.cookies);
    }
    return res.redirect(302, payload.redirectUrl);
  }
}

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: AUTH_ADMIN_LOGIN_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('login')
  login(@Body() body: AdminLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    return this.authService.loginAdmin(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    }).then((payload) => applyAuthResponseCookies(res, payload));
  }

  @AuthAudienceAccess(AuthAudience.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub, user.sid, AuthAudience.ADMIN);
  }

  @Get('session')
  session(@Req() req: Request) {
    return this.authService.getSessionStateFromAccessToken(
      readAccessTokenFromCookies(req, AuthAudience.ADMIN),
      AuthAudience.ADMIN,
    );
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    const refreshToken = readRefreshTokenFromCookies(req, AuthAudience.ADMIN);
    return this.authService.refreshSessionByRefreshToken(AuthAudience.ADMIN, refreshToken)
      .then((payload) => applyAuthResponseCookies(res, payload));
  }

  @AuthAudienceAccess(AuthAudience.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Post('logout')
  logout(@CurrentUser() user: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    clearAuthCookies(res, AuthAudience.ADMIN);
    issueStandaloneCsrfCookie(res);
    return this.authService.logout(user.sub, user.sid, AuthAudience.ADMIN);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @AdminPermission('dashboard.view')
  @Get('dashboard/stats')
  dashboardStats(@CurrentUser() user: any) {
    return this.authService.getAdminDashboardStats(user?.role);
  }
}

@Controller('yayasan')
export class YayasanAuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: AUTH_REGISTER_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('register')
  register(@Body() body: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    return this.authService.register(body, Role.YAYASAN, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    }).then((payload) => applyAuthResponseCookies(res, payload));
  }

  @Get('register')
  registerRedirect(@Req() req: Request, @Res() res: Response) {
    return res.redirect(302, buildFrontendRedirect(getDashboardFrontendBaseUrl(), '/yayasan/register', req.query));
  }

  @Throttle({ default: { limit: AUTH_LOGIN_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    return this.authService.login(body, Role.YAYASAN, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    }).then((payload) => applyAuthResponseCookies(res, payload));
  }

  @AuthAudienceAccess(AuthAudience.YAYASAN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub, user.sid, AuthAudience.YAYASAN);
  }

  @Get('session')
  session(@Req() req: Request) {
    return this.authService.getSessionStateFromAccessToken(
      readAccessTokenFromCookies(req, AuthAudience.YAYASAN),
      AuthAudience.YAYASAN,
    );
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    const refreshToken = readRefreshTokenFromCookies(req, AuthAudience.YAYASAN);
    return this.authService.refreshSessionByRefreshToken(AuthAudience.YAYASAN, refreshToken)
      .then((payload) => applyAuthResponseCookies(res, payload));
  }

  @AuthAudienceAccess(AuthAudience.YAYASAN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Post('logout')
  logout(@CurrentUser() user: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    clearAuthCookies(res, AuthAudience.YAYASAN);
    issueStandaloneCsrfCookie(res);
    return this.authService.logout(user.sub, user.sid, AuthAudience.YAYASAN);
  }

  @AuthAudienceAccess(AuthAudience.YAYASAN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.YAYASAN)
  @Put('profile')
  updateProfile(@CurrentUser() user: any, @Req() req: Request, @Body() body: UpdateProfileDto) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    return this.authService.updateProfile(user.sub, body);
  }

  @Throttle({ default: { limit: AUTH_PASSWORD_RECOVERY_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request) {
    assertTrustedMutationRequest(req);
    return this.authService.forgotPassword(body.email, Role.YAYASAN);
  }

  @Throttle({ default: { limit: AUTH_PASSWORD_RECOVERY_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto, @Req() req: Request) {
    assertTrustedMutationRequest(req);
    return this.authService.resetPassword(body.token, body.password);
  }
}

@Controller('mitra')
export class MitraAuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: AUTH_REGISTER_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('register')
  register() {
    return this.authService.rejectPublicMitraRegistration();
  }

  @Throttle({ default: { limit: AUTH_LOGIN_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    return this.authService.login(body, Role.MITRA, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    }).then((payload) => applyAuthResponseCookies(res, payload));
  }

  @Get('invite/validate')
  validateInvite(@Query('token') token?: string) {
    return this.authService.validateMitraInvite(token);
  }

  @Post('invite/claim')
  claimInvite(@Body() body: ClaimMitraInviteDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    return this.authService.claimMitraInvite(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    }).then((payload) => applyAuthResponseCookies(res, payload));
  }

  @AuthAudienceAccess(AuthAudience.MITRA)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub, user.sid, AuthAudience.MITRA);
  }

  @Get('session')
  session(@Req() req: Request) {
    return this.authService.getSessionStateFromAccessToken(
      readAccessTokenFromCookies(req, AuthAudience.MITRA),
      AuthAudience.MITRA,
    );
  }

  @Post('refresh')
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    const refreshToken = readRefreshTokenFromCookies(req, AuthAudience.MITRA);
    return this.authService.refreshSessionByRefreshToken(AuthAudience.MITRA, refreshToken)
      .then((payload) => applyAuthResponseCookies(res, payload));
  }

  @AuthAudienceAccess(AuthAudience.MITRA)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Post('logout')
  logout(@CurrentUser() user: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    clearAuthCookies(res, AuthAudience.MITRA);
    issueStandaloneCsrfCookie(res);
    return this.authService.logout(user.sub, user.sid, AuthAudience.MITRA);
  }

  @AuthAudienceAccess(AuthAudience.MITRA)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.MITRA)
  @Put('profile')
  updateProfile(@CurrentUser() user: any, @Req() req: Request, @Body() body: UpdateProfileDto) {
    assertTrustedMutationRequest(req);
    if (!validateCsrfRequest(req)) {
      throw new ForbiddenException('AUTH_CSRF_INVALID');
    }
    return this.authService.updateProfile(user.sub, body);
  }

  @Throttle({ default: { limit: AUTH_PASSWORD_RECOVERY_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto, @Req() req: Request) {
    assertTrustedMutationRequest(req);
    return this.authService.forgotPassword(body.email, Role.MITRA);
  }

  @Throttle({ default: { limit: AUTH_PASSWORD_RECOVERY_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto, @Req() req: Request) {
    assertTrustedMutationRequest(req);
    return this.authService.resetPassword(body.token, body.password);
  }
}
