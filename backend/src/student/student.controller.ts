import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth 
} from '@nestjs/swagger';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AssignBatchDto } from './dto/assign-batch.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Students')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('profile/me')
  @ApiOperation({ summary: 'Get current logged-in student profile details' })
  async findMe(@Req() req: any) {
    const data = await this.studentService.findOneByUser(req.tenant.id, req.user.id);
    return {
      success: true,
      data,
      message: 'Logged-in student profile retrieved.',
    };
  }

  @Get('profile/me/attendance-summary')
  @ApiOperation({ summary: 'Get current student attendance summary' })
  async getMyAttendanceSummary(@Req() req: any) {
    const student = await this.studentService.findOneByUser(req.tenant.id, req.user.id);
    const data = await this.studentService.getAttendanceSummary(req.tenant.id, student.id);
    return {
      success: true,
      data,
      message: 'Student attendance summary retrieved.',
    };
  }

  @Get('profile/me/fee-summary')
  @ApiOperation({ summary: 'Get current student fee summary' })
  async getMyFeeSummary(@Req() req: any) {
    const student = await this.studentService.findOneByUser(req.tenant.id, req.user.id);
    const data = await this.studentService.getFeeSummary(req.tenant.id, student.id);
    return {
      success: true,
      data,
      message: 'Student fee summary retrieved.',
    };
  }

  @Get()
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'List all students under tenant academy' })
  @ApiQuery({ name: 'search', required: false, description: 'Search students by name, email, or admission number' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter students by user status (active/inactive)' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filter students by branch ID' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter students by course ID' })
  @ApiQuery({ name: 'batchId', required: false, description: 'Filter students by batch ID' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 250, description: 'Success catalog payload return' })
  async findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('courseId') courseId?: string,
    @Query('batchId') batchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    const data = await this.studentService.findAll(req.tenant.id, {
      search,
      status,
      branchId,
      courseId,
      batchId,
      page: pageNum,
      limit: limitNum,
    });

    return {
      success: true,
      data,
      message: 'Students matching filters fetched successfully.',
    };
  }

  @Get(':id')
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'Get a student profile by ID' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const data = await this.studentService.findOne(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Student profile details retrieved successfully.',
    };
  }

  @Get(':id/attendance-summary')
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'Get attendance summary for a specific student ID' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  async getStudentAttendanceSummary(@Req() req: any, @Param('id') id: string) {
    const data = await this.studentService.getAttendanceSummary(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Student attendance summary retrieved.',
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('students:create')
  @ApiOperation({ summary: 'Create a new student user and profile' })
  async create(@Req() req: any, @Body() dto: CreateStudentDto) {
    const data = await this.studentService.create(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Student account and profile created successfully.',
    };
  }

  @Patch(':id')
  @RequirePermissions('students:update')
  @ApiOperation({ summary: 'Update an existing student profile' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto
  ) {
    const data = await this.studentService.update(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'Student profile updated successfully.',
    };
  }

  @Delete(':id')
  @RequirePermissions('students:delete')
  @ApiOperation({ summary: 'Delete or soft delete a student profile' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  async remove(
    @Req() req: any, 
    @Param('id') id: string,
    @Query('permanent') permanent?: string
  ) {
    const isPermanent = permanent === 'true' || permanent === '1';
    const data = await this.studentService.remove(req.tenant.id, id, isPermanent);
    return {
      success: true,
      data,
      message: isPermanent ? 'Student permanently deleted from database.' : 'Student profile soft-deleted.',
    };
  }

  @Post(':id/batches')
  @RequirePermissions('students:update')
  @ApiOperation({ summary: 'Assign a student to a batch' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  async assignBatch(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AssignBatchDto
  ) {
    const data = await this.studentService.assignBatch(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'Student batch assignment completed successfully.',
    };
  }

  @Get(':id/attendance-summary')
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'Get student attendance counts summary' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  async getAttendanceSummary(@Req() req: any, @Param('id') id: string) {
    const data = await this.studentService.getAttendanceSummary(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Student attendance summary retrieved successfully.',
    };
  }

  @Get(':id/fee-summary')
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'Get student fee allocations and balance summary' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  async getFeeSummary(@Req() req: any, @Param('id') id: string) {
    const data = await this.studentService.getFeeSummary(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Student fee summary retrieved successfully.',
    };
  }

  @Patch(':id/photo')
  @RequirePermissions('students:update')
  @ApiOperation({ summary: 'Update student profile photo' })
  @ApiParam({ name: 'id', description: 'Student UUID' })
  async updatePhoto(
    @Req() req: any,
    @Param('id') id: string,
    @Body('avatarId') avatarId: string
  ) {
    const data = await this.studentService.updatePhoto(req.tenant.id, id, avatarId);
    return {
      success: true,
      data,
      message: 'Student profile photo updated successfully.',
    };
  }
}
