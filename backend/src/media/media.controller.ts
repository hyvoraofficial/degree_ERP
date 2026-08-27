import { 
  Controller, Get, Post, Delete, Body, Param, Req, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiParam, ApiBearerAuth 
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CreateMediaFileDto } from './dto/create-media-file.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Centralized Media Storage & Presigning')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload/presign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate pre-signed upload URL parameters for direct Supabase/S3 transfers' })
  async generatePresignedUploadUrl(@Req() req: any, @Body() dto: CreateMediaFileDto) {
    const data = await this.mediaService.generatePresignedUploadUrl(req.tenant.id, req.user.id, dto);
    return {
      success: true,
      data,
      message: 'Presigned upload parameters generated successfully.',
    };
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Generate transient signed download URL for secure asset reads' })
  @ApiParam({ name: 'id', description: 'Media File UUID' })
  async generateSignedDownloadUrl(@Req() req: any, @Param('id') id: string) {
    const data = await this.mediaService.generateSignedDownloadUrl(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Transient download link resolved successfully.',
    };
  }

  @Delete(':id')
  @RequirePermissions('students:delete')
  @ApiOperation({ summary: 'Delete file metadata and storage backends references (Staff only)' })
  @ApiParam({ name: 'id', description: 'Media File UUID' })
  async deleteFile(@Req() req: any, @Param('id') id: string) {
    const data = await this.mediaService.deleteFile(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Media asset deleted successfully.',
    };
  }
}
