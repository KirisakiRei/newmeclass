import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  private hasRoleAccess(role: Role, requiredRole: Role) {
    if (role === Role.DEVELOPER) return true;
    if (role === requiredRole) return true;

    const hierarchy: Role[] = [Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER];
    if (!hierarchy.includes(role) || !hierarchy.includes(requiredRole)) {
      return false;
    }

    return hierarchy.indexOf(role) >= hierarchy.indexOf(requiredRole);
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const role = req.user?.role as Role | undefined;

    const allowed = role ? requiredRoles.some((requiredRole) => this.hasRoleAccess(role, requiredRole)) : false;

    if (!allowed) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
