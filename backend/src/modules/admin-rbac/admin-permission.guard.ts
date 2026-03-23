import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_PERMISSION_KEY } from './admin-permission.decorator';
import { AdminRbacService } from './admin-rbac.service';

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly adminRbacService: AdminRbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[]>(ADMIN_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permissions || permissions.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    await this.adminRbacService.assertPermission(req.user?.sub, permissions);
    return true;
  }
}
