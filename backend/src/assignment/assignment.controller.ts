import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Req, Query, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth 
} from '@nestjs/swagger';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Assignments & Grading')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  // ==========================================
  // ASSIGNMENT CRUD ENDPOINTS
  // ==========================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('assignments:create')
  @ApiOperation({ summary: 'Create a new homework assignment task (Teacher only)' })
  async create(@Req() req: any, @Body() dto: CreateAssignmentDto) {
    const data = await this.assignmentService.create(req.tenant.id, req.user.id, dto);
    return {
      success: true,
      data,
      message: 'Assignment task published successfully.',
    };
  }

  @Get()
  @RequirePermissions('assignments:read')
  @ApiOperation({ summary: 'List all homework assignments' })
  @ApiQuery({ name: 'batchId', required: false, description: 'Filter by Batch UUID' })
  @ApiQuery({ name: 'subjectId', required: false, description: 'Filter by Subject UUID' })
  async findAll(
    @Req() req: any,
    @Query('batchId') batchId?: string,
    @Query('subjectId') subjectId?: string
  ) {
    const data = await this.assignmentService.findAll(req.tenant.id, { batchId, subjectId });
    return {
      success: true,
      data,
      message: 'Assignments list retrieved successfully.',
    };
  }

  @Get(':id')
  @RequirePermissions('assignments:read')
  @ApiOperation({ summary: 'Get details of specific assignment' })
  @ApiParam({ name: 'id', description: 'Assignment UUID' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const data = await this.assignmentService.findOne(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Assignment details retrieved successfully.',
    };
  }

  @Delete(':id')
  @RequirePermissions('assignments:delete')
  @ApiOperation({ summary: 'Soft-delete assignment task and submissions' })
  @ApiParam({ name: 'id', description: 'Assignment UUID' })
  async remove(@Req() req: any, @Param('id') id: string) {
    const data = await this.assignmentService.remove(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Assignment deleted successfully.',
    };
  }

  // ==========================================
  // SUBMISSIONS & GRADING ENDPOINTS
  // ==========================================

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('assignments:create')
  @ApiOperation({ summary: 'Submit assignment work (Student only)' })
  @ApiParam({ name: 'id', description: 'Assignment UUID' })
  async submit(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto
  ) {
    const data = await this.assignmentService.submit(req.tenant.id, req.user.id, id, dto);
    return {
      success: true,
      data,
      message: 'Assignment work submitted successfully.',
    };
  }

  @Get(':id/submissions')
  @RequirePermissions('assignments:read')
  @ApiOperation({ summary: 'List student submissions details for review (Teacher/Admin)' })
  @ApiParam({ name: 'id', description: 'Assignment UUID' })
  async findSubmissions(@Req() req: any, @Param('id') id: string) {
    const data = await this.assignmentService.findSubmissions(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Submissions list fetched successfully.',
    };
  }

  @Get('submissions/:submissionId')
  @RequirePermissions('assignments:read')
  @ApiOperation({ summary: 'Get details of specific submission' })
  @ApiParam({ name: 'submissionId', description: 'Submission UUID' })
  async findOneSubmission(@Req() req: any, @Param('submissionId') submissionId: string) {
    const data = await this.assignmentService.findOneSubmission(req.tenant.id, submissionId);
    return {
      success: true,
      data,
      message: 'Submission details retrieved successfully.',
    };
  }

  @Patch('submissions/:submissionId/grade')
  @RequirePermissions('assignments:update')
  @ApiOperation({ summary: 'Grade submission and post feedback (Teacher review)' })
  @ApiParam({ name: 'submissionId', description: 'Submission UUID' })
  async grade(
    @Req() req: any,
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto
  ) {
    const data = await this.assignmentService.grade(req.tenant.id, req.user.id, submissionId, dto);
    return {
      success: true,
      data,
      message: 'Submission review marks and feedback saved.',
    };
  }
}
