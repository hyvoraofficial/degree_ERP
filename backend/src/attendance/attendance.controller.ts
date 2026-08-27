import { 
  Controller, Get, Post, Body, Query, Param, Req, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiQuery, ApiParam, ApiBearerAuth 
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { SubmitStudentAttendanceDto } from './dto/submit-student-attendance.dto';
import { SubmitTeacherAttendanceDto } from './dto/submit-teacher-attendance.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Attendance Tracking')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // ==========================================
  // STUDENT ATTENDANCE ENDPOINTS
  // ==========================================

  @Post('students')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('attendance:create')
  @ApiOperation({ summary: 'Submit bulk student attendance register (Teacher/Admin)' })
  async submitStudentAttendance(@Req() req: any, @Body() dto: SubmitStudentAttendanceDto) {
    const data = await this.attendanceService.submitStudentAttendance(req.tenant.id, req.user.id, dto);
    return {
      success: true,
      data,
      message: 'Student attendance register updated successfully.',
    };
  }

  @Get('students')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Retrieve student attendance report for specific day and batch' })
  @ApiQuery({ name: 'batchId', required: true, description: 'Batch UUID' })
  @ApiQuery({ name: 'date', required: true, description: 'Date YYYY-MM-DD' })
  @ApiQuery({ name: 'subjectId', required: false, description: 'Optional Subject UUID' })
  async getStudentAttendanceReport(
    @Req() req: any,
    @Query('batchId') batchId: string,
    @Query('date') date: string,
    @Query('subjectId') subjectId?: string
  ) {
    const data = await this.attendanceService.getStudentAttendanceReport(
      req.tenant.id,
      batchId,
      date,
      subjectId
    );
    return {
      success: true,
      data,
      message: 'Daily student attendance register fetched successfully.',
    };
  }

  @Get('students/:studentId/monthly')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Retrieve student monthly attendance summary card' })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  @ApiQuery({ name: 'month', required: true, example: 7 })
  async getStudentMonthlyReport(
    @Req() req: any,
    @Param('studentId') studentId: string,
    @Query('year') year: string,
    @Query('month') month: string
  ) {
    const data = await this.attendanceService.getStudentMonthlyReport(
      req.tenant.id,
      studentId,
      parseInt(year, 10),
      parseInt(month, 10)
    );
    return {
      success: true,
      data,
      message: 'Monthly student attendance card retrieved successfully.',
    };
  }

  @Get('students/:studentId/subject-wise')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Retrieve student subject-wise attendance summary percentages' })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  async getStudentSubjectWiseAttendance(
    @Req() req: any,
    @Param('studentId') studentId: string
  ) {
    const data = await this.attendanceService.getStudentSubjectWiseAttendance(
      req.tenant.id,
      studentId
    );
    return {
      success: true,
      data,
      message: 'Subject-wise student attendance summary fetched successfully.',
    };
  }

  // ==========================================
  // TEACHER ATTENDANCE ENDPOINTS
  // ==========================================

  @Post('teachers')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Submit bulk teacher attendance logs (Admin only)' })
  async submitTeacherAttendance(@Req() req: any, @Body() dto: SubmitTeacherAttendanceDto) {
    const data = await this.attendanceService.submitTeacherAttendance(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Teacher attendance logs updated successfully.',
    };
  }

  @Get('teachers')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Retrieve teacher daily logs report (Admin only)' })
  @ApiQuery({ name: 'date', required: true, description: 'Date YYYY-MM-DD' })
  async getTeacherAttendanceReport(@Req() req: any, @Query('date') date: string) {
    const data = await this.attendanceService.getTeacherAttendanceReport(req.tenant.id, date);
    return {
      success: true,
      data,
      message: 'Daily teacher logs report retrieved successfully.',
    };
  }

  @Get('teachers/:teacherId/monthly')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Retrieve teacher monthly logs summary card' })
  @ApiParam({ name: 'teacherId', description: 'Teacher UUID' })
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  @ApiQuery({ name: 'month', required: true, example: 7 })
  async getTeacherMonthlyReport(
    @Req() req: any,
    @Param('teacherId') teacherId: string,
    @Query('year') year: string,
    @Query('month') month: string
  ) {
    const data = await this.attendanceService.getTeacherMonthlyReport(
      req.tenant.id,
      teacherId,
      parseInt(year, 10),
      parseInt(month, 10)
    );
    return {
      success: true,
      data,
      message: 'Monthly teacher logs card retrieved successfully.',
    };
  }

  // ==========================================
  // ATTENDANCE ANALYTICS
  // ==========================================

  @Get('analytics')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Retrieve present rate analytics statistics for batch charts' })
  @ApiQuery({ name: 'batchId', required: false, description: 'Filter by Batch UUID' })
  async getAttendanceAnalytics(@Req() req: any, @Query('batchId') batchId?: string) {
    const data = await this.attendanceService.getAttendanceAnalytics(req.tenant.id, { batchId });
    return {
      success: true,
      data,
      message: 'Attendance analytics fetched successfully.',
    };
  }
}
