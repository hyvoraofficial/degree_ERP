import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CreateTimetableDto {
  @ApiProperty({ description: 'Branch / Campus UUID' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ description: 'Degree Program / Course UUID' })
  @IsUUID()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ description: 'Batch / Section UUID' })
  @IsUUID()
  @IsNotEmpty()
  batchId: string;

  @ApiProperty({ description: 'Subject UUID' })
  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @ApiProperty({ description: 'Assigned Faculty Teacher UUID' })
  @IsUUID()
  @IsNotEmpty()
  teacherId: string;

  @ApiProperty({ description: 'Day of week', example: 'Monday' })
  @IsString()
  @IsNotEmpty()
  dayOfWeek: string;

  @ApiProperty({ description: 'Start time slot', example: '09:00 AM' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'End time slot', example: '10:00 AM' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiPropertyOptional({ description: 'Room / Lecture Hall or Lab number', example: 'LH-302' })
  @IsString()
  @IsOptional()
  roomNumber?: string;

  @ApiPropertyOptional({ description: 'Is Practical / Laboratory session', default: false })
  @IsBoolean()
  @IsOptional()
  isLab?: boolean;
}
