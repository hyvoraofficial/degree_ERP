import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum SubjectType {
  THEORY = 'theory',
  PRACTICAL = 'practical',
  LAB = 'lab'
}

export class CreateCourseSubjectDto {
  @ApiProperty({ example: 's1111111-1111-1111-1111-111111111111', required: false })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'Physics', description: 'Name of the subject' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'PHYS-101', description: 'Subject code (optional)', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ example: 'Mechanics and Thermodynamics', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'theory', enum: SubjectType, required: false })
  @IsEnum(SubjectType)
  @IsOptional()
  subjectType?: SubjectType;

  @ApiProperty({ example: 'active', required: false })
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateCourseDto {
  @ApiProperty({ example: 'Grade 10 Secondary Education', description: 'Name of the course' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'GRADE-10', description: 'Unique course code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Syllabus and batches mapped to Grade 10 students', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'f3333333-3333-3333-3333-333333333333', description: 'Media file ID mapping syllabus document', required: false })
  @IsUUID()
  @IsOptional()
  syllabusId?: string;

  @ApiProperty({ example: 'b1111111-1111-1111-1111-111111111111', description: 'Branch UUID ID mapping this course' })
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: '1 Year', description: 'Course duration length description', required: false })
  @IsString()
  @IsOptional()
  duration?: string;

  @ApiProperty({ example: 'active', description: 'Activation status of course', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ type: [CreateCourseSubjectDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCourseSubjectDto)
  subjects?: CreateCourseSubjectDto[];
}
