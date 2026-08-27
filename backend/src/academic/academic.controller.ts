import { 
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards, HttpCode, HttpStatus 
} from '@nestjs/common';
import { 
  ApiTags, ApiOperation, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth 
} from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Academic Administration')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain tenant descriptor (e.g. demo)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // ==========================================
  // COURSE ENDPOINTS
  // ==========================================

  @Get('courses')
  @RequirePermissions('courses:read')
  @ApiOperation({ summary: 'List courses under active tenant' })
  @ApiQuery({ name: 'search', required: false, description: 'Search courses by name or code' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filter courses by Branch UUID ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter courses by activation status' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findAllCourses(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const data = await this.academicService.findAllCourses(req.tenant.id, {
      search,
      branchId,
      status,
      page: pageNum,
      limit: limitNum,
    });

    return {
      success: true,
      data,
      message: 'Courses fetched successfully.',
    };
  }

  @Get('courses/:id')
  @RequirePermissions('courses:read')
  @ApiOperation({ summary: 'Get course details with mapped subjects' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  async findOneCourse(@Req() req: any, @Param('id') id: string) {
    const data = await this.academicService.findOneCourse(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Course profile retrieved successfully.',
    };
  }

  @Post('courses')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('courses:create')
  @ApiOperation({ summary: 'Create a new course profile' })
  async createCourse(@Req() req: any, @Body() dto: CreateCourseDto) {
    const data = await this.academicService.createCourse(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Course created successfully.',
    };
  }

  @Patch('courses/:id')
  @RequirePermissions('courses:update')
  @ApiOperation({ summary: 'Update an existing course details' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  async updateCourse(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCourseDto>
  ) {
    const data = await this.academicService.updateCourse(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'Course details updated successfully.',
    };
  }

  @Delete('courses/:id')
  @RequirePermissions('courses:delete')
  @ApiOperation({ summary: 'Delete or soft-delete a course profile' })
  @ApiParam({ name: 'id', description: 'Course UUID' })
  async removeCourse(
    @Req() req: any, 
    @Param('id') id: string,
    @Query('permanent') permanent?: string
  ) {
    const isPermanent = permanent === 'true' || permanent === '1';
    const data = await this.academicService.removeCourse(req.tenant.id, id, isPermanent);
    return {
      success: true,
      data,
      message: isPermanent ? 'Course deleted permanently from database.' : 'Course soft-deleted successfully.',
    };
  }

  // ==========================================
  // SUBJECT ENDPOINTS
  // ==========================================

  @Get('subjects')
  @RequirePermissions('courses:read')
  @ApiOperation({ summary: 'List subjects under active tenant' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter subjects by Course UUID' })
  async findAllSubjects(@Req() req: any, @Query('courseId') courseId?: string) {
    const data = await this.academicService.findAllSubjects(req.tenant.id, courseId);
    return {
      success: true,
      data,
      message: 'Subjects list retrieved successfully.',
    };
  }

  @Post('subjects/assignments')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('teachers:update')
  @ApiOperation({ summary: 'Assign a teacher to branch/course/subject/batch cohort' })
  async assignTeacherSubject(
    @Req() req: any,
    @Body() dto: { branchId: string; courseId: string; subjectId: string; batchId: string; teacherId: string }
  ) {
    const data = await this.academicService.assignTeacherSubject(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Teacher assigned to subject cohort successfully.',
    };
  }

  @Get('subjects/assignments')
  @RequirePermissions('teachers:read')
  @ApiOperation({ summary: 'List teacher subject assignments' })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'subjectId', required: false })
  async getTeacherAssignments(
    @Req() req: any,
    @Query('teacherId') teacherId?: string,
    @Query('subjectId') subjectId?: string
  ) {
    const data = await this.academicService.getTeacherAssignments(req.tenant.id, { teacherId, subjectId });
    return {
      success: true,
      data,
      message: 'Teacher subject assignments list fetched successfully.',
    };
  }

  @Delete('subjects/assignments/:id')
  @RequirePermissions('teachers:update')
  @ApiOperation({ summary: 'Remove a teacher subject assignment' })
  @ApiParam({ name: 'id' })
  async removeTeacherAssignment(@Req() req: any, @Param('id') id: string) {
    const data = await this.academicService.removeTeacherAssignment(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Teacher subject assignment removed successfully.',
    };
  }

  @Get('subjects/:id')
  @RequirePermissions('courses:read')
  @ApiOperation({ summary: 'Get details of specific subject' })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  async findOneSubject(@Req() req: any, @Param('id') id: string) {
    const data = await this.academicService.findOneSubject(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Subject details retrieved successfully.',
    };
  }

  @Post('subjects')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('courses:create')
  @ApiOperation({ summary: 'Create a new subject mapped to course' })
  async createSubject(@Req() req: any, @Body() dto: CreateSubjectDto) {
    const data = await this.academicService.createSubject(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Subject mapped successfully.',
    };
  }

  @Patch('subjects/:id')
  @RequirePermissions('courses:update')
  @ApiOperation({ summary: 'Update parameters of an existing subject' })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  async updateSubject(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreateSubjectDto> & { status?: string }) {
    const data = await this.academicService.updateSubject(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'Subject parameters updated successfully.',
    };
  }

  @Delete('subjects/:id')
  @RequirePermissions('courses:delete')
  @ApiOperation({ summary: 'Delete or soft-delete a subject' })
  @ApiParam({ name: 'id', description: 'Subject UUID' })
  async removeSubject(
    @Req() req: any, 
    @Param('id') id: string,
    @Query('permanent') permanent?: string
  ) {
    const isPermanent = permanent === 'true' || permanent === '1';
    const data = await this.academicService.removeSubject(req.tenant.id, id, isPermanent);
    return {
      success: true,
      data,
      message: isPermanent ? 'Subject deleted permanently from database.' : 'Subject soft-deleted successfully.',
    };
  }



  // ==========================================
  // BATCH ENDPOINTS
  // ==========================================

  @Get('batches')
  @RequirePermissions('batches:read')
  @ApiOperation({ summary: 'List batches with filters' })
  @ApiQuery({ name: 'search', required: false, description: 'Search batches by name or code' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Filter batches by Branch UUID' })
  @ApiQuery({ name: 'courseId', required: false, description: 'Filter batches by Course UUID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter batches by activation status' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findAllBatches(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('courseId') courseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const data = await this.academicService.findAllBatches(req.tenant.id, {
      search,
      branchId,
      courseId,
      status,
      page: pageNum,
      limit: limitNum,
    });
    return {
      success: true,
      data,
      message: 'Batches list fetched successfully.',
    };
  }

  @Get('batches/:id')
  @RequirePermissions('batches:read')
  @ApiOperation({ summary: 'Get details of specific batch with student roster and schedules' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  async findOneBatch(@Req() req: any, @Param('id') id: string) {
    const data = await this.academicService.findOneBatch(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Batch roster and schedules retrieved successfully.',
    };
  }

  @Post('batches')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('batches:create')
  @ApiOperation({ summary: 'Provision a new student study batch' })
  async createBatch(@Req() req: any, @Body() dto: CreateBatchDto) {
    const data = await this.academicService.createBatch(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Batch provisioned successfully.',
    };
  }

  @Patch('batches/:id')
  @RequirePermissions('batches:update')
  @ApiOperation({ summary: 'Update an existing batch parameters' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  async updateBatch(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateBatchDto>
  ) {
    const data = await this.academicService.updateBatch(req.tenant.id, id, dto);
    return {
      success: true,
      data,
      message: 'Batch details updated successfully.',
    };
  }

  @Delete('batches/:id')
  @RequirePermissions('batches:delete')
  @ApiOperation({ summary: 'Soft-delete/archive a batch' })
  @ApiParam({ name: 'id', description: 'Batch UUID' })
  async removeBatch(@Req() req: any, @Param('id') id: string) {
    const data = await this.academicService.removeBatch(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Batch archived successfully.',
    };
  }

  // ==========================================
  // CLASS SCHEDULE / TIMETABLE ENDPOINTS
  // ==========================================

  @Get('schedules')
  @RequirePermissions('batches:read')
  @ApiOperation({ summary: 'List weekly class timetable schedules' })
  @ApiQuery({ name: 'batchId', required: false, description: 'Filter schedules by Batch UUID' })
  @ApiQuery({ name: 'teacherId', required: false, description: 'Filter schedules by Teacher UUID' })
  async findSchedules(
    @Req() req: any,
    @Query('batchId') batchId?: string,
    @Query('teacherId') teacherId?: string
  ) {
    const data = await this.academicService.findSchedules(req.tenant.id, {
      batchId,
      teacherId,
    });

    return {
      success: true,
      data,
      message: 'Class schedules timetable list retrieved successfully.',
    };
  }

  @Post('schedules')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('batches:create')
  @ApiOperation({ summary: 'Map a class schedule timetable slot' })
  async createSchedule(@Req() req: any, @Body() dto: CreateScheduleDto) {
    const data = await this.academicService.createSchedule(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Class schedule slot mapped successfully.',
    };
  }

  @Delete('schedules/:id')
  @RequirePermissions('batches:delete')
  @ApiOperation({ summary: 'Delete a class schedule slot' })
  @ApiParam({ name: 'id', description: 'Class Schedule UUID' })
  async removeSchedule(@Req() req: any, @Param('id') id: string) {
    const data = await this.academicService.removeSchedule(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Class schedule slot deleted successfully.',
    };
  }
}
