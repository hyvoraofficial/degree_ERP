import { 
  Controller, Get, Post, Body, Param, Req, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiParam, ApiBearerAuth 
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Role & Permission Management')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List all custom and system roles available to tenant' })
  async findAllRoles(@Req() req: any) {
    const data = await this.userService.findAllRoles(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Roles fetched successfully.',
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Create a new custom role under active tenant' })
  async createRole(@Req() req: any, @Body() dto: CreateRoleDto) {
    const data = await this.userService.createRole(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Role created successfully.',
    };
  }

  @Post(':id/permissions')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Map permissions list to custom role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  async assignPermissions(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto
  ) {
    const data = await this.userService.assignPermissions(req.tenant.id, id, dto.permissionCodes);
    return {
      success: true,
      data,
      message: 'Role permissions map updated successfully.',
    };
  }

  @Get('permissions')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List all system-wide functional permission codes' })
  async findAllPermissions() {
    const data = await this.userService.findAllPermissions();
    return {
      success: true,
      data,
      message: 'System permissions catalog fetched successfully.',
    };
  }
}
