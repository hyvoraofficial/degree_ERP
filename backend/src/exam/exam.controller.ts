import { 
  Controller, Get, Post, Delete, Body, Param, Req, Query, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth 
} from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamPaperDto } from './dto/create-exam-paper.dto';
import { BulkMarksEntryDto } from './dto/bulk-marks-entry.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Examinations & Transcripts')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  // ==========================================
  // EXAM ENDPOINTS
  // ==========================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('exams:create')
  @ApiOperation({ summary: 'Create a new exam schedule container (Admin only)' })
  async createExam(@Req() req: any, @Body() dto: CreateExamDto) {
    const data = await this.examService.createExam(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Exam schedule created successfully.',
    };
  }

  @Get()
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'List all exams schedule containers' })
  async findAllExams(@Req() req: any) {
    const data = await this.examService.findAllExams(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Exams list retrieved successfully.',
    };
  }

  @Get(':id')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'Get exam schedule details with paper listings' })
  @ApiParam({ name: 'id', description: 'Exam UUID' })
  async findOneExam(@Req() req: any, @Param('id') id: string) {
    const data = await this.examService.findOneExam(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Exam details retrieved successfully.',
    };
  }

  @Delete(':id')
  @RequirePermissions('exams:delete')
  @ApiOperation({ summary: 'Soft-delete exam container and mapped papers' })
  @ApiParam({ name: 'id', description: 'Exam UUID' })
  async removeExam(@Req() req: any, @Param('id') id: string) {
    const data = await this.examService.removeExam(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Exam container deleted successfully.',
    };
  }

  // ==========================================
  // EXAM PAPER ENDPOINTS
  // ==========================================

  @Post('papers')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('exams:create')
  @ApiOperation({ summary: 'Provision a new subject test paper (Admin only)' })
  async createPaper(@Req() req: any, @Body() dto: CreateExamPaperDto) {
    const data = await this.examService.createPaper(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Exam test paper created successfully.',
    };
  }

  @Get('papers/list')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'List all exam test papers' })
  @ApiQuery({ name: 'examId', required: false })
  @ApiQuery({ name: 'batchId', required: false })
  async findPapers(
    @Req() req: any,
    @Query('examId') examId?: string,
    @Query('batchId') batchId?: string
  ) {
    const data = await this.examService.findPapers(req.tenant.id, examId, batchId);
    return {
      success: true,
      data,
      message: 'Exam papers fetched successfully.',
    };
  }

  @Get('papers/:id')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'Get details of specific exam paper' })
  @ApiParam({ name: 'id', description: 'Exam Paper UUID' })
  async findOnePaper(@Req() req: any, @Param('id') id: string) {
    const data = await this.examService.findOnePaper(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Exam paper details retrieved successfully.',
    };
  }

  @Delete('papers/:id')
  @RequirePermissions('exams:delete')
  @ApiOperation({ summary: 'Delete exam paper' })
  @ApiParam({ name: 'id', description: 'Exam Paper UUID' })
  async removePaper(@Req() req: any, @Param('id') id: string) {
    const data = await this.examService.removePaper(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Exam paper deleted successfully.',
    };
  }

  // ==========================================
  // MARKS ENTRY & GRADE REPORTS ENDPOINTS
  // ==========================================

  @Post('marks/bulk')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('exams:create')
  @ApiOperation({ summary: 'Record student exam marks entry (Teacher/Admin only)' })
  async submitMarks(@Req() req: any, @Body() dto: BulkMarksEntryDto) {
    const data = await this.examService.submitMarks(req.tenant.id, req.user.id, dto);
    return {
      success: true,
      data,
      message: 'Exam marks entries saved successfully.',
    };
  }

  @Get('papers/:id/ranks')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'Get student rank listings of an exam paper based on score performance' })
  @ApiParam({ name: 'id', description: 'Exam Paper UUID' })
  async getExamRanks(@Req() req: any, @Param('id') id: string) {
    const data = await this.examService.getExamRanks(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Exam student ranks fetched successfully.',
    };
  }

  @Get('reports/student/:studentId')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'Generate student academic term report card transcript' })
  @ApiParam({ name: 'studentId', description: 'Student UUID' })
  @ApiQuery({ name: 'examId', required: true, description: 'Exam container UUID' })
  async getStudentReportCard(
    @Req() req: any,
    @Param('studentId') studentId: string,
    @Query('examId') examId: string
  ) {
    const data = await this.examService.getStudentReportCard(req.tenant.id, studentId, examId);
    return {
      success: true,
      data,
      message: 'Student term report card generated.',
    };
  }
}
