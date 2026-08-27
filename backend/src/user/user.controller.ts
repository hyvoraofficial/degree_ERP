import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth 
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('User Management')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all users under active tenant' })
  @ApiQuery({ name: 'search', required: false, description: 'Search users by name or email' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const data = await this.userService.findAll(req.tenant.id, {
      search,
      page: pageNum,
      limit: limitNum,
    });

    return {
      success: true,
      data,
      message: 'Users list retrieved successfully.',
    };
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Retrieve specific user profile and role memberships' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const data = await this.userService.findOne(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'User profile retrieved successfully.',
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Provision a new user account and map roles' })
  async create(@Req() req: any, @Body() dto: CreateUserDto) {
    const data = await this.userService.create(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'User account created successfully.',
    };
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Modify an existing user profile details' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto
  ) {
    const data = await this.userService.update(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'User profile updated successfully.',
    };
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @ApiOperation({ summary: 'Soft-delete user credentials and roles' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async remove(@Req() req: any, @Param('id') id: string) {
    const data = await this.userService.remove(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'User account deactivated successfully.',
    };
  }

  @Post(':id/roles')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Map/Override user access roles' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async assignRoles(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AssignRoleDto
  ) {
    const data = await this.userService.assignRoles(req.tenant.id, id, dto.roleCodes);
    return {
      success: true,
      data,
      message: 'User roles updated successfully.',
    };
  }
}
