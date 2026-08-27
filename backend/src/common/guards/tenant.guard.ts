import { CanActivate, ExecutionContext, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract subdomain from header, query parameter, or host header
    let subdomain = (
      request.headers['x-academy-subdomain'] || 
      request.query?.subdomain || 
      request.query?.tenant || 
      request.query?.x_subdomain
    );

    // Fallback resolution from Host header (e.g., demo.hyvora.com)
    if (!subdomain && request.headers.host) {
      const host = request.headers.host.split(':')[0];
      const parts = host.split('.');
      if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'app') {
        subdomain = parts[0];
      }
    }

    // Default fallback to 'hyvora' for direct browser links / downloads if unprovided
    if (!subdomain) {
      subdomain = process.env.DEFAULT_TENANT_SUBDOMAIN || 'hyvora';
    }

    // In a multi-tenant environment, the platform-level queries skip tenant restrictions (e.g. super-admin)
    if (subdomain === 'platform' || subdomain === 'platform-global') {
      request.tenant = { id: 'platform', name: 'HYVORA Platform' };
      return true;
    }

    // Fetch matching Academy to assert presence and check status
    let academy = await this.prisma.academy.findUnique({
      where: { subdomain },
    });

    // Fallback: If tenant subdomain is not found, fallback to primary default active tenant ('hyvora' or first active academy)
    if (!academy) {
      academy = await this.prisma.academy.findFirst({
        where: { status: 'active', deletedAt: null },
      });
    }

    if (!academy) {
      throw new NotFoundException(`Academy tenant with subdomain "${subdomain}" not registered on HYVORA.`);
    }

    if (academy.status !== 'active') {
      throw new BadRequestException(`Academy "${academy.name}" status is suspended or inactive.`);
    }

    // Attach active tenant info to request object
    request.tenant = academy;

    return true;
  }
}
