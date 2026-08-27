import { 
  Controller, Get, Query, Req, UseGuards 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiBearerAuth 
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Analytics & Dashboard Reports')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'Get general dashboard summary stats counters (Admin/Staff)' })
  async getDashboardStats(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getDashboardStats(req.tenant.id, query);
    return {
      success: true,
      data,
      message: 'Dashboard counters fetched successfully.',
    };
  }

  @Get('students')
  @RequirePermissions('students:read')
  @ApiOperation({ summary: 'Get student demographic distributions and growth statistics' })
  async getStudentAnalytics(@Req() req: any) {
    const data = await this.analyticsService.getStudentAnalytics(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Student demographic metrics resolved.',
    };
  }

  @Get('teachers')
  @RequirePermissions('teachers:read')
  @ApiOperation({ summary: 'Get teacher leave request metrics and performance distributions' })
  async getTeacherAnalytics(@Req() req: any) {
    const data = await this.analyticsService.getTeacherAnalytics(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Teacher operational metrics resolved.',
    };
  }

  @Get('revenue')
  @RequirePermissions('finance:read')
  @ApiOperation({ summary: 'Get monthly tuition payments collection trends and summary methods' })
  async getRevenueAnalytics(@Req() req: any) {
    const data = await this.analyticsService.getRevenueAnalytics(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Revenue aggregation metrics resolved.',
    };
  }

  @Get('attendance')
  @RequirePermissions('attendance:read')
  @ApiOperation({ summary: 'Get batch attendance rankings and weekly presence rates charts' })
  async getAttendanceAnalytics(@Req() req: any) {
    const data = await this.analyticsService.getAttendanceAnalytics(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Attendance presence trends charts resolved.',
    };
  }
}
