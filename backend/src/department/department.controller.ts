import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/create-department.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';

@ApiTags('Departments Management')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain descriptor (e.g. hyvora)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @ApiOperation({ summary: 'List all college departments' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Campus filter' })
  @ApiQuery({ name: 'search', required: false, description: 'Search name or code' })
  async findAll(@Req() req: any, @Query('branchId') branchId?: string, @Query('search') search?: string) {
    const data = await this.departmentService.findAll(req.tenant.id, branchId, search);
    return {
      success: true,
      data,
      message: 'Departments fetched successfully.',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department details by ID' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const data = await this.departmentService.findOne(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Department details retrieved.',
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new college department' })
  async create(@Req() req: any, @Body() dto: CreateDepartmentDto) {
    const data = await this.departmentService.create(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Department created successfully.',
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update department information' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<UpdateDepartmentDto>) {
    const data = await this.departmentService.update(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'Department updated successfully.',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a department' })
  @ApiParam({ name: 'id', description: 'Department UUID' })
  async remove(@Req() req: any, @Param('id') id: string) {
    const data = await this.departmentService.remove(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Department deleted successfully.',
    };
  }
}
