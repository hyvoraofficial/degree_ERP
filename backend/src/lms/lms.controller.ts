import { 
  Controller, Get, Post, Delete, Body, Param, Query, Req, Res, UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth, ApiConsumes 
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { LmsService } from './lms.service';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto';
import { CreateVideoLectureDto } from './dto/create-video-lecture.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('LMS & Learning Resources')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('lms')
export class LmsController {
  constructor(private readonly lmsService: LmsService) {}

  // ==========================================
  // STORAGE SIGNATURE ENDPOINT
  // ==========================================

  @Get('storage/upload-params')
  @RequirePermissions('materials:create')
  @ApiOperation({ summary: 'Request Supabase Storage upload signed orders' })
  @ApiQuery({ name: 'fileName', required: true, example: 'calculus-guide.pdf' })
  @ApiQuery({ name: 'fileType', required: true, example: 'application/pdf' })
  async getStorageUploadParameters(
    @Req() req: any,
    @Query('fileName') fileName: string,
    @Query('fileType') fileType: string
  ) {
    const data = await this.lmsService.getStorageUploadParameters(req.tenant.id, fileName, fileType);
    return {
      success: true,
      data,
      message: 'Direct Supabase upload parameters resolved successfully.',
    };
  }

  // ==========================================
  // STUDY MATERIAL ENDPOINTS
  // ==========================================

  @Post('materials/upload')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('materials:create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload local file & publish study material (Teacher/Admin only)' })
  async uploadMaterial(
    @Req() req: any,
    @UploadedFile() file: any,
    @Body() body: any
  ) {
    const teacherId = req.user.id;
    let batchIds: string[] = [];
    if (body.batchIds) {
      if (Array.isArray(body.batchIds)) {
        batchIds = body.batchIds;
      } else if (typeof body.batchIds === 'string') {
        try {
          batchIds = JSON.parse(body.batchIds);
        } catch {
          batchIds = body.batchIds.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
    }

    const data = await this.lmsService.uploadAndCreateMaterial(req.tenant.id, teacherId, file, {
      title: body.title,
      description: body.description,
      subjectId: body.subjectId,
      materialType: body.materialType,
      accessLevel: body.accessLevel || 'batch_only',
      batchIds,
    });

    return {
      success: true,
      data,
      message: 'Study material file uploaded and published successfully.',
    };
  }

  @Get('materials')
  @RequirePermissions('materials:read')
  @ApiOperation({ summary: 'List study materials matching search/batch filters' })
  @ApiQuery({ name: 'search', required: false, description: 'Search materials by title' })
  @ApiQuery({ name: 'subjectId', required: false, description: 'Filter materials by Subject UUID' })
  @ApiQuery({ name: 'batchId', required: false, description: 'Filter materials mapped to Batch UUID' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findAllMaterials(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('subjectId') subjectId?: string,
    @Query('batchId') batchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const data = await this.lmsService.findAllMaterials(req.tenant.id, {
      search,
      subjectId,
      batchId,
      page: pageNum,
      limit: limitNum,
    });

    return {
      success: true,
      data,
      message: 'Study materials fetched successfully.',
    };
  }

  @Get('materials/:id/access-url')
  @RequirePermissions('materials:read')
  @ApiOperation({ summary: 'Generate secure signed URL for study material file access' })
  @ApiParam({ name: 'id', description: 'Study Material UUID' })
  async getMaterialAccessUrl(@Req() req: any, @Param('id') id: string) {
    const data = await this.lmsService.getMaterialAccessUrl(req.tenant.id, req.user, id);
    return {
      success: true,
      data,
      message: 'Study material access URL generated successfully',
    };
  }

  @Get('materials/:id/download')
  @RequirePermissions('materials:read')
  @ApiOperation({ summary: 'Direct stream/download endpoint for study material file' })
  @ApiParam({ name: 'id', description: 'Study Material UUID' })
  async downloadMaterialFile(@Req() req: any, @Param('id') id: string, @Res() res: any) {
    return this.lmsService.downloadMaterialFile(req.tenant.id, id, res);
  }

  @Get('materials/:id')
  @RequirePermissions('materials:read')
  @ApiOperation({ summary: 'Get details of specific study material resource' })
  @ApiParam({ name: 'id', description: 'Study Material UUID' })
  async findOneMaterial(@Req() req: any, @Param('id') id: string) {
    const data = await this.lmsService.findOneMaterial(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Study material details retrieved successfully.',
    };
  }

  @Post('materials')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('materials:create')
  @ApiOperation({ summary: 'Publish new study materials (Teacher/Admin only)' })
  async createMaterial(@Req() req: any, @Body() dto: CreateStudyMaterialDto) {
    // In production, teacherId matches active user's teacher record
    const teacherId = req.user.id; 
    const data = await this.lmsService.createMaterial(req.tenant.id, teacherId, dto);
    return {
      success: true,
      data,
      message: 'Study material published successfully.',
    };
  }

  @Delete('materials/:id')
  @RequirePermissions('materials:delete')
  @ApiOperation({ summary: 'Delete study material profile' })
  @ApiParam({ name: 'id', description: 'Study Material UUID' })
  async removeMaterial(@Req() req: any, @Param('id') id: string) {
    const data = await this.lmsService.removeMaterial(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Study material deleted successfully.',
    };
  }

  // ==========================================
  // VIDEO LECTURE ENDPOINTS
  // ==========================================

  @Get('videos')
  @RequirePermissions('materials:read')
  @ApiOperation({ summary: 'List video lectures matching search/batch filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'batchId', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findAllVideos(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('batchId') batchId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const data = await this.lmsService.findAllVideos(req.tenant.id, {
      search,
      batchId,
      page: pageNum,
      limit: limitNum,
    });

    return {
      success: true,
      data,
      message: 'Video lectures fetched successfully.',
    };
  }

  @Get('videos/:id')
  @RequirePermissions('materials:read')
  @ApiOperation({ summary: 'Get specific video lecture details' })
  @ApiParam({ name: 'id', description: 'Video Lecture UUID' })
  async findOneVideo(@Req() req: any, @Param('id') id: string) {
    const data = await this.lmsService.findOneVideo(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Video lecture details retrieved successfully.',
    };
  }

  @Post('videos')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('materials:create')
  @ApiOperation({ summary: 'Publish new video lecture (Teacher/Admin only)' })
  async createVideoLecture(@Req() req: any, @Body() dto: CreateVideoLectureDto) {
    const teacherId = req.user.id;
    const data = await this.lmsService.createVideoLecture(req.tenant.id, teacherId, dto);
    return {
      success: true,
      data,
      message: 'Video lecture published successfully.',
    };
  }

  @Delete('videos/:id')
  @RequirePermissions('materials:delete')
  @ApiOperation({ summary: 'Delete video lecture' })
  @ApiParam({ name: 'id', description: 'Video Lecture UUID' })
  async removeVideo(@Req() req: any, @Param('id') id: string) {
    const data = await this.lmsService.removeVideo(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Video lecture deleted successfully.',
    };
  }
}
