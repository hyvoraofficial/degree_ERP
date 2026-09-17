import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TimetableService } from './timetable.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';

@ApiTags('Timetable Management')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain descriptor (e.g. hyvora)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get section timetable by Batch ID' })
  @ApiParam({ name: 'batchId', description: 'Batch UUID' })
  async findByBatch(@Req() req: any, @Param('batchId') batchId: string) {
    const data = await this.timetableService.findByBatch(req.tenant.id, batchId);
    return {
      success: true,
      data,
      message: 'Batch timetable retrieved successfully.',
    };
  }

  @Get('faculty/:teacherId')
  @ApiOperation({ summary: 'Get faculty teaching timetable' })
  @ApiParam({ name: 'teacherId', description: 'Faculty UUID' })
  async findByTeacher(@Req() req: any, @Param('teacherId') teacherId: string) {
    const data = await this.timetableService.findByTeacher(req.tenant.id, teacherId);
    return {
      success: true,
      data,
      message: 'Faculty teaching timetable retrieved successfully.',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create timetable schedule entry' })
  async create(@Req() req: any, @Body() dto: CreateTimetableDto) {
    const data = await this.timetableService.create(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Timetable entry scheduled successfully.',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete timetable entry' })
  @ApiParam({ name: 'id', description: 'Schedule UUID' })
  async remove(@Req() req: any, @Param('id') id: string) {
    const data = await this.timetableService.remove(req.tenant.id, id);
    return {
      success: true,
      data,
      message: 'Timetable entry deleted.',
    };
  }
}
