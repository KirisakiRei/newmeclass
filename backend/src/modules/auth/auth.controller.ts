import { Body, Controller, Get, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
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

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: AUTH_REGISTER_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('register')
  register(@Body() body: RegisterDto, @Req() req: Request) {
    return this.authService.register(body, Role.USER, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }

  @Get('register')
  registerRedirect(@Req() req: Request, @Res() res: Response) {
    return res.redirect(302, buildFrontendRedirect(getPublicFrontendBaseUrl(), '/register', req.query));
  }

  @Throttle({ default: { limit: AUTH_LOGIN_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(body, Role.USER, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub, user.sid);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh-session')
  refreshSession(@CurrentUser() user: any) {
    return this.authService.refreshSession(user.sub, user.sid);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @Post('bridge-ticket')
  createBridgeTicket(@CurrentUser() user: any, @Body() body: CreateBridgeTicketDto, @Req() req: Request) {
    return this.authService.createBridgeTicket(user.sub, user.sid, body.target, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }

  @Post('bridge-exchange')
  exchangeBridgeTicket(@Body() body: ExchangeBridgeTicketDto, @Req() req: Request) {
    return this.authService.exchangeBridgeTicket(body.ticket, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  updateProfile(@CurrentUser() user: any, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  changePassword(@CurrentUser() user: any, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(user.sub, body);
  }

  @Throttle({ default: { limit: AUTH_PASSWORD_RECOVERY_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { limit: AUTH_PASSWORD_RECOVERY_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('referral-link')
  referralLink(@CurrentUser() user: any) {
    return this.authService.getReferralLink(user.sub);
  }
}

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: AUTH_ADMIN_LOGIN_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('login')
  login(@Body() body: AdminLoginDto, @Req() req: Request) {
    return this.authService.loginAdmin(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
  @Get('me')
  me(@CurrentUser() user: any) {
    return this.authService.getProfile(user.sub, user.sid);
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
  register(@Body() body: RegisterDto, @Req() req: Request) {
    return this.authService.register(body, Role.YAYASAN, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }

  @Get('register')
  registerRedirect(@Req() req: Request, @Res() res: Response) {
    return res.redirect(302, buildFrontendRedirect(getDashboardFrontendBaseUrl(), '/yayasan/register', req.query));
  }

  @Throttle({ default: { limit: AUTH_LOGIN_RATE_LIMIT, ttl: AUTH_RATE_LIMIT_TTL_MS } })
  @Post('login')
  login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(body, Role.YAYASAN, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
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
  login(@Body() body: LoginDto, @Req() req: Request) {
    return this.authService.login(body, Role.MITRA, false, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }

  @Get('invite/validate')
  validateInvite(@Query('token') token?: string) {
    return this.authService.validateMitraInvite(token);
  }

  @Post('invite/claim')
  claimInvite(@Body() body: ClaimMitraInviteDto, @Req() req: Request) {
    return this.authService.claimMitraInvite(body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null,
    });
  }
}
