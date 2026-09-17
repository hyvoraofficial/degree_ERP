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

  @Get('results/all')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'List all exam results across students' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'batchId', required: false })
  @ApiQuery({ name: 'examId', required: false })
  async findAllResults(
    @Req() req: any,
    @Query('courseId') courseId?: string,
    @Query('batchId') batchId?: string,
    @Query('examId') examId?: string
  ) {
    const data = await this.examService.findAllResults(req.tenant.id, { courseId, batchId, examId });
    return {
      success: true,
      data,
      message: 'Exam results list fetched successfully.',
    };
  }

  @Get('semester-grades/all')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'List all student semester grades (SGPA/CGPA)' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'semester', required: false })
  async findAllSemesterGrades(
    @Req() req: any,
    @Query('studentId') studentId?: string,
    @Query('courseId') courseId?: string,
    @Query('semester') semester?: string
  ) {
    const data = await this.examService.findAllSemesterGrades(req.tenant.id, {
      studentId,
      courseId,
      semester: semester ? parseInt(semester, 10) : undefined,
    });
    return {
      success: true,
      data,
      message: 'Semester grades fetched successfully.',
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
      message: 'Exam paper configured successfully.',
    };
  }

  @Get('papers/subject/:subjectId')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'Get all papers for a subject' })
  @ApiParam({ name: 'subjectId', description: 'Subject UUID' })
  async findPapersBySubject(@Req() req: any, @Param('subjectId') subjectId: string) {
    const data = await this.examService.findPapersBySubject(req.tenant.id, subjectId);
    return {
      success: true,
      data,
      message: 'Subject exam papers retrieved successfully.',
    };
  }

  @Get('papers/batch/:batchId')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'Get all papers scheduled for a batch' })
  @ApiParam({ name: 'batchId', description: 'Batch UUID' })
  async findPapersByBatch(@Req() req: any, @Param('batchId') batchId: string) {
    const data = await this.examService.findPapersByBatch(req.tenant.id, batchId);
    return {
      success: true,
      data,
      message: 'Batch exam papers retrieved successfully.',
    };
  }

  @Get('papers/:id')
  @RequirePermissions('exams:read')
  @ApiOperation({ summary: 'Get specific paper metadata and enrolled candidate marksheets' })
  @ApiParam({ name: 'id', description: 'Exam Paper UUID' })
  async findOnePaper(@Req() req: any, @Param('id') id: string) {
    const data = await this.examService.findOnePaper(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Exam paper details retrieved.',
    };
  }

  @Delete('papers/:id')
  @RequirePermissions('exams:delete')
  @ApiOperation({ summary: 'Delete an exam paper' })
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
  // MARKS RECORDING & TRANSCRIPTS
  // ==========================================

  @Post('marks')
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
}
