import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpStatus, HttpCode 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth 
} from '@nestjs/swagger';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Branches')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @RequirePermissions('branches:create')
  @ApiOperation({ summary: 'Create a new branch under tenant academy' })
  @ApiResponse({ status: 201, description: 'Branch successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request validation' })
  @ApiResponse({ status: 409, description: 'Conflict error on unique values' })
  async create(@Req() req: any, @Body() dto: CreateBranchDto) {
    return this.branchService.create(req.tenant.id, dto);
  }

  @Get()
  @RequirePermissions('branches:read')
  @ApiOperation({ summary: 'List and search branches under tenant academy' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term for branch name/code/city' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (active/inactive)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated list of branches' })
  async findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.branchService.findAll(req.tenant.id, search, status, pageNum, limitNum);
  }

  @Get(':id')
  @RequirePermissions('branches:read')
  @ApiOperation({ summary: 'Get details of a single branch' })
  @ApiParam({ name: 'id', description: 'Branch UUID ID' })
  @ApiResponse({ status: 200, description: 'Branch details payload' })
  @ApiResponse({ status: 400, description: 'Branch not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.branchService.findOne(req.tenant.id, id);
  }

  @Patch(':id')
  @RequirePermissions('branches:update')
  @ApiOperation({ summary: 'Edit/update a branch details' })
  @ApiParam({ name: 'id', description: 'Branch UUID ID' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request validations' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto
  ) {
    return this.branchService.update(req.tenant.id, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('branches:delete')
  @ApiOperation({ summary: 'Delete a branch permanently or soft delete' })
  @ApiParam({ name: 'id', description: 'Branch UUID ID' })
  async remove(
    @Req() req: any, 
    @Param('id') id: string,
    @Query('permanent') permanent?: string
  ) {
    const isPermanent = permanent === 'true' || permanent === '1';
    return this.branchService.remove(req.tenant.id, id, isPermanent);
  }
}
