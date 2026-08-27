import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth 
} from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Teacher Management')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('profile/me')
  @ApiOperation({ summary: 'Get current logged-in teacher profile and class schedules' })
  async findMe(@Req() req: any) {
    const data = await this.teacherService.findOneByUser(req.tenant.id, req.user.id);
    return {
      success: true,
      data,
      message: 'Logged-in teacher profile retrieved successfully.',
    };
  }

  @Get()
  @RequirePermissions('teachers:read')
  @ApiOperation({ summary: 'List all teachers under active tenant' })
  @ApiQuery({ name: 'search', required: false, description: 'Search teachers by name or employee number' })
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

    const data = await this.teacherService.findAll(req.tenant.id, {
      search,
      page: pageNum,
      limit: limitNum,
    });

    return {
      success: true,
      data,
      message: 'Teachers matching filters fetched successfully.',
    };
  }

  @Get(':id')
  @RequirePermissions('teachers:read')
  @ApiOperation({ summary: 'Retrieve specific teacher profile information' })
  @ApiParam({ name: 'id', description: 'Teacher UUID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const data = await this.teacherService.findOne(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Teacher profile details retrieved successfully.',
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('teachers:create')
  @ApiOperation({ summary: 'Provision a new teacher account and profile' })
  async create(@Req() req: any, @Body() dto: CreateTeacherDto) {
    const data = await this.teacherService.create(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Teacher account created successfully.',
    };
  }

  @Patch(':id')
  @RequirePermissions('teachers:update')
  @ApiOperation({ summary: 'Update an existing teacher profile information' })
  @ApiParam({ name: 'id', description: 'Teacher UUID' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto
  ) {
    const data = await this.teacherService.update(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'Teacher profile updated successfully.',
    };
  }

  @Delete(':id')
  @RequirePermissions('teachers:delete')
  @ApiOperation({ summary: 'Delete or soft-delete a teacher profile' })
  @ApiParam({ name: 'id', description: 'Teacher UUID' })
  async remove(
    @Req() req: any, 
    @Param('id') id: string,
    @Query('permanent') permanent?: string
  ) {
    const isPermanent = permanent === 'true' || permanent === '1';
    const data = await this.teacherService.remove(req.tenant.id, id, isPermanent);
    return {
      success: true,
      data,
      message: isPermanent ? 'Teacher profile deleted permanently from database.' : 'Teacher profile soft-deleted successfully.',
    };
  }

  // ==========================================
  // LEAVE ENDPOINTS
  // ==========================================

  @Post(':id/leaves')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('teachers:update')
  @ApiOperation({ summary: 'Submit a new leave application request' })
  @ApiParam({ name: 'id', description: 'Teacher UUID' })
  async applyLeave(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ApplyLeaveDto
  ) {
    const data = await this.teacherService.applyLeave(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'Leave application submitted successfully.',
    };
  }

  @Get(':id/leaves')
  @RequirePermissions('teachers:read')
  @ApiOperation({ summary: 'Get teacher leave request histories' })
  @ApiParam({ name: 'id', description: 'Teacher UUID' })
  async findLeaves(@Req() req: any, @Param('id') id: string) {
    const data = await this.teacherService.findLeaves(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Leave history retrieved successfully.',
    };
  }

  @Patch(':id/leaves/:leaveId/approve')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Approve or Reject leave request (Admin only)' })
  @ApiParam({ name: 'id', description: 'Teacher UUID' })
  @ApiParam({ name: 'leaveId', description: 'Leave Application UUID' })
  async approveLeave(
    @Req() req: any,
    @Param('id') id: string,
    @Param('leaveId') leaveId: string,
    @Body() dto: ApproveLeaveDto
  ) {
    const data = await this.teacherService.approveLeave(
      req.tenant.id,
      id,
      leaveId,
      req.user.id,
      dto
    );
    return {
      success: true,
      data,
      message: `Leave application status updated to "${dto.status}".`,
    };
  }

  // ==========================================
  // TIMETABLE & SALARY ENDPOINTS
  // ==========================================

  @Get(':id/timetable')
  @RequirePermissions('teachers:read')
  @ApiOperation({ summary: 'Retrieve teacher weekly class timetables schedules' })
  @ApiParam({ name: 'id', description: 'Teacher UUID' })
  async getTimetable(@Req() req: any, @Param('id') id: string) {
    const data = await this.teacherService.getTimetable(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Teacher weekly timetable retrieved successfully.',
    };
  }

  @Get(':id/salary')
  @RequirePermissions('teachers:read')
  @ApiOperation({ summary: 'Retrieve teacher salary ledger setup guidelines' })
  @ApiParam({ name: 'id', description: 'Teacher UUID' })
  async getSalary(@Req() req: any, @Param('id') id: string) {
    const data = await this.teacherService.getSalary(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Teacher salary structure metadata fetched successfully.',
    };
  }
}
