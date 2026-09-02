import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsUUID, IsOptional } from 'class-validator';

export enum SubjectType {
  THEORY = 'theory',
  PRACTICAL = 'practical',
  LAB = 'lab'
}

export class CreateSubjectDto {
  @ApiProperty({ example: 'c1111111-1111-1111-1111-111111111111', description: 'Course ID or UUID' })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ example: 'Advanced Algebra', description: 'Name of the subject' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'MATH-A10', description: 'Subject code (optional)', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ example: 'algebra, linear equations and vectors', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'theory', enum: SubjectType, required: false })
  @IsEnum(SubjectType)
  @IsOptional()
  subjectType?: SubjectType;
}
