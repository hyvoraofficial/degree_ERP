import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { PlacementService } from './placement.service';
import { CreatePlacementDriveDto, ApplyPlacementDto } from './dto/create-placement.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';

@ApiTags('Campus Placements')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain descriptor (e.g. hyvora)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('placements')
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  @Get()
  @ApiOperation({ summary: 'List active placement drives' })
  async findAll(@Req() req: any) {
    const data = await this.placementService.findAllDrives(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Placement drives fetched successfully.',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get placement drive details and applicants' })
  @ApiParam({ name: 'id', description: 'Drive UUID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const data = await this.placementService.findDriveDetails(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Placement drive details retrieved.',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new campus placement drive' })
  async create(@Req() req: any, @Body() dto: CreatePlacementDriveDto) {
    const data = await this.placementService.createDrive(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Placement drive created successfully.',
    };
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Student application for placement drive' })
  @ApiParam({ name: 'id', description: 'Drive UUID' })
  async apply(@Req() req: any, @Param('id') id: string, @Body() dto: ApplyPlacementDto) {
    const data = await this.placementService.applyToDrive(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'Application submitted successfully.',
    };
  }

  @Patch('applications/:appId')
  @ApiOperation({ summary: 'Update applicant status (shortlisted, selected, etc.)' })
  @ApiParam({ name: 'appId', description: 'Application record UUID' })
  async updateStatus(
    @Req() req: any,
    @Param('appId') appId: string,
    @Body() body: { status: string; remarks?: string }
  ) {
    const data = await this.placementService.updateApplicationStatus(
      req.tenant.id,
      appId,
      body.status,
      body.remarks
    );
    return {
      success: true,
      data,
      message: 'Applicant status updated.',
    };
  }
}
