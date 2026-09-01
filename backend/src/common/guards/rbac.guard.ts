import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication token missing or invalid session.');
    }

    // Tenant Isolation Check: Verify authenticated user belongs to the requested tenant
    const requestTenant = request.tenant;
    if (
      requestTenant && 
      requestTenant.id !== 'platform' && 
      user.academyId && 
      user.role !== 'SUPER_ADMIN' &&
      user.academyId !== requestTenant.id
    ) {
      throw new ForbiddenException(`Cross-tenant access forbidden: user does not belong to tenant "${requestTenant.name || requestTenant.id}".`);
    }

    // If no specific permissions required for route, allow authenticated user
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Direct bypass for Super Admin or Academy Admin roles within their own tenant
    if (user.role === 'SUPER_ADMIN' || user.role === 'ACADEMY_ADMIN') {
      return true;
    }

    // Retrieve active roles and associated permissions mapped to user within their tenant
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId: user.id,
        academyId: user.academyId,
        deletedAt: null,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const userPermissionCodes = new Set<string>();

    for (const mapping of userRoles) {
      const role = mapping.role;
      if (role.code === 'ACADEMY_ADMIN' || role.code === 'SUPER_ADMIN') {
        return true;
      }
      for (const rolePerm of role.permissions) {
        if (rolePerm.permission && !rolePerm.deletedAt) {
          userPermissionCodes.add(rolePerm.permission.code);
        }
      }
    }

    // Validate presence of all required permissions
    const hasClearance = requiredPermissions.every((perm) => userPermissionCodes.has(perm));

    if (!hasClearance) {
      throw new ForbiddenException('Clearance level mismatch: user lacks required RBAC permissions.');
    }

    return true;
  }
}
