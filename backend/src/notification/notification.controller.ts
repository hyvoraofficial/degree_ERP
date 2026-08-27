import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiParam, ApiBearerAuth 
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { TriggerTemplateDto } from './dto/trigger-template.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Notifications & Templates')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ==========================================
  // TEMPLATE ENDPOINTS
  // ==========================================

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Configure a new notification template (Admin only)' })
  async createTemplate(@Req() req: any, @Body() dto: CreateTemplateDto) {
    const data = await this.notificationService.createTemplate(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Notification template configured successfully.',
    };
  }

  @Get('templates')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List configured templates (Admin only)' })
  async findTemplates(@Req() req: any) {
    const data = await this.notificationService.findTemplates(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Templates list retrieved successfully.',
    };
  }

  @Delete('templates/:id')
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Delete a template configuration' })
  @ApiParam({ name: 'id', description: 'Template UUID' })
  async removeTemplate(@Req() req: any, @Param('id') id: string) {
    const data = await this.notificationService.removeTemplate(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Notification template removed successfully.',
    };
  }

  // ==========================================
  // DISPATCH & LOGS ENDPOINTS
  // ==========================================

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Submit direct notification message dispatch' })
  async sendDirect(@Req() req: any, @Body() dto: SendNotificationDto) {
    const data = await this.notificationService.sendDirect(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Notification dispatch queued successfully.',
    };
  }

  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Trigger a template-based notification dispatch' })
  async triggerTemplate(@Req() req: any, @Body() dto: TriggerTemplateDto) {
    const data = await this.notificationService.triggerTemplate(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Template notification triggered and queued.',
    };
  }

  @Get('user')
  @ApiOperation({ summary: 'List active user in-app notifications' })
  async findUserNotifications(@Req() req: any) {
    const data = await this.notificationService.findUserNotifications(req.tenant.id, req.user.id);
    return {
      success: true,
      data,
      message: 'Active user notification list retrieved.',
    };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark in-app notification status as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const data = await this.notificationService.markAsRead(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Notification marked read.',
    };
  }

  @Get('logs')
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List system notifications dispatch history logs (Admin only)' })
  async getLogs(@Req() req: any) {
    const data = await this.notificationService.getLogs(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Notifications log history fetched successfully.',
    };
  }
}
