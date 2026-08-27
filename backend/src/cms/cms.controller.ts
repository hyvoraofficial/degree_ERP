import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiParam, ApiBearerAuth 
} from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { CreatePageDto } from './dto/create-page.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { SubmitContactDto } from './dto/submit-contact.dto';
import { SubmitAdmissionEnquiryDto } from './dto/submit-admission-enquiry.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Website CMS & Admissions Enquiry')
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard)
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  // ==========================================
  // PUBLIC WEBSITE ENDPOINTS (No Jwt Auth)
  // ==========================================

  @Post('contact')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit inbound website contact form query' })
  async submitContact(@Req() req: any, @Body() dto: SubmitContactDto) {
    const data = await this.cmsService.submitContact(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Your inquiry has been submitted. We will contact you shortly.',
    };
  }

  @Post('admissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register an online student admission application' })
  async submitAdmissionEnquiry(@Req() req: any, @Body() dto: SubmitAdmissionEnquiryDto) {
    const data = await this.cmsService.submitAdmissionEnquiry(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Admission query recorded. Our admissions officer will review details.',
    };
  }

  @Get('pages/:slug')
  @ApiOperation({ summary: 'Fetch published page layout content by route slug path' })
  @ApiParam({ name: 'slug', description: 'URL route slug path' })
  async findOnePage(@Req() req: any, @Param('slug') slug: string) {
    const data = await this.cmsService.findOnePage(req.tenant.id, slug);
    return {
      success: true,
      data,
      message: 'Page layouts resolved successfully.',
    };
  }

  @Get('testimonials')
  @ApiOperation({ summary: 'List customer feedback testimonials' })
  async findAllTestimonials(@Req() req: any) {
    const data = await this.cmsService.findAllTestimonials(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Testimonials list fetched.',
    };
  }

  // ==========================================
  // ADMINISTRATIVE PORTAL ENDPOINTS (Auth & RBAC)
  // ==========================================

  @Post('pages')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Publish a new website CMS page layout (Admin only)' })
  async createPage(@Req() req: any, @Body() dto: CreatePageDto) {
    const data = await this.prismaCreatePage(req, dto);
    return {
      success: true,
      data,
      message: 'CMS page layout published successfully.',
    };
  }

  private prismaCreatePage(req: any, dto: CreatePageDto) {
    return this.cmsService.createPage(req.tenant.id, dto);
  }

  @Get('pages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List all CMS page logs' })
  async findAllPages(@Req() req: any) {
    const data = await this.cmsService.findAllPages(req.tenant.id);
    return {
      success: true,
      data,
      message: 'CMS page list retrieved.',
    };
  }

  @Delete('pages/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Remove a CMS page route' })
  @ApiParam({ name: 'id', description: 'Page UUID' })
  async removePage(@Req() req: any, @Param('id') id: string) {
    const data = await this.cmsService.removePage(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Page removed successfully.',
    };
  }

  @Post('testimonials')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Publish parent feedback testimonial review' })
  async createTestimonial(@Req() req: any, @Body() dto: CreateTestimonialDto) {
    const data = await this.cmsService.createTestimonial(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Testimonial saved.',
    };
  }

  @Get('contact/logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List inbound website query log logs' })
  async findContacts(@Req() req: any) {
    const data = await this.cmsService.findContacts(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Contact messages retrieved.',
    };
  }

  @Patch('contact/:id/resolve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('settings:update')
  @ApiOperation({ summary: 'Mark contact message status resolved with follow up notes' })
  @ApiParam({ name: 'id', description: 'Contact query UUID' })
  async resolveContact(
    @Req() req: any,
    @Param('id') id: string,
    @Body('notes') notes: string
  ) {
    const data = await this.cmsService.resolveContact(req.tenant.id, req.user.id, id, notes);
    return {
      success: true,
      data,
      message: 'Contact enquiry status updated resolved.',
    };
  }

  @Get('admissions/logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List admission applications logs' })
  async getAdmissionEnquiries(@Req() req: any) {
    const data = await this.cmsService.getAdmissionEnquiries(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Admission registrations retrieved.',
    };
  }
}
