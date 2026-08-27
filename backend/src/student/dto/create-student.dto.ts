import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsEnum, IsOptional, IsDateString, IsObject, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export class StudentParentDto {
  @ApiProperty({ example: 'Sanjay Verma', description: 'Father legal name' })
  @IsString()
  @IsNotEmpty()
  fatherName: string;

  @ApiProperty({ example: 'Kiran Verma', description: 'Mother legal name' })
  @IsString()
  @IsNotEmpty()
  motherName: string;

  @ApiProperty({ example: '+91-9876543213', description: 'Parent contact phone' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'sanjay.verma@gmail.com', description: 'Parent contact email', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsEmail({}, { message: 'Parent email must be a valid email format.' })
  @IsOptional()
  email?: string;
}

export class StudentDocumentsDto {
  @ApiProperty({ example: '3ba29a28-98df-4a6f-a89c-567abed43011', description: 'Media File ID for Student Photo', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  @IsOptional()
  studentPhotoId?: string;

  @ApiProperty({ example: '3ba29a28-98df-4a6f-a89c-567abed43012', description: 'Media File ID for Aadhaar card copy', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  @IsOptional()
  aadhaarId?: string;

  @ApiProperty({ example: '3ba29a28-98df-4a6f-a89c-567abed43013', description: 'Media File ID for previous marks card', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  @IsOptional()
  previousMarksCardId?: string;
}

export class CreateStudentDto {
  @ApiProperty({ example: 'arjun@academy.edu', description: 'Unique email address for user login' })
  @IsEmail({}, { message: 'Please enter a valid email format.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @ApiProperty({ example: 'Arjun', description: 'First name of the student' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Mehta', description: 'Last name of the student' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+91-9876543212', description: 'Student phone number', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'b1111111-1111-1111-1111-111111111111', description: 'Branch ID student belongs to' })
  @IsString()
  @IsNotEmpty({ message: 'Operational Branch is required.' })
  branchId: string;

  @ApiProperty({ example: 'c3333333-3333-3333-3333-333333333333', description: 'Course ID student is enrolled in' })
  @IsString()
  @IsNotEmpty({ message: 'Course is required.' })
  courseId: string;

  @ApiProperty({ example: 'b3333333-3333-3333-3333-333333333333', description: 'Batch ID student belongs to' })
  @IsString()
  @IsNotEmpty({ message: 'Batch is required.' })
  batchId: string;

  @ApiProperty({ example: 'HYV-2026-0001', description: 'Unique school admission number (optional)', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  @IsOptional()
  admissionNumber?: string;

  @ApiProperty({ example: '2010-05-15', description: 'Student date of birth in ISO YYYY-MM-DD', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsDateString({}, { message: 'Date of birth must be a valid ISO date.' })
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ example: 'male', enum: Gender, required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsEnum(Gender, { message: 'Gender must be male, female, other, or prefer_not_to_say.' })
  @IsOptional()
  gender?: Gender;

  @ApiProperty({ example: 'O+', description: 'Student blood group', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @ApiProperty({ type: StudentParentDto, description: 'Parent details' })
  @IsObject()
  @ValidateNested()
  @Type(() => StudentParentDto)
  parent: StudentParentDto;

  @ApiProperty({ type: StudentDocumentsDto, description: 'Document upload mappings', required: false })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => StudentDocumentsDto)
  documents?: StudentDocumentsDto;

  @ApiProperty({ example: 'ROLL-101', description: 'Student batch roll number', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  @IsOptional()
  rollNumber?: string;

  @ApiProperty({ example: 'Standard 2 Year Plan', description: 'Student selected Fee Plan option', required: false })
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsString()
  @IsOptional()
  feePlan?: string;
}
