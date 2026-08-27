import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsOptional, IsDateString, IsObject } from 'class-validator';

export class CreateTeacherDto {
  @ApiProperty({ example: 'teacher1@academy.edu', description: 'Teacher email address for portal login' })
  @IsEmail({}, { message: 'Invalid email address format.' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Suresh', description: 'First name of the teacher' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Kumar', description: 'Last name of the teacher' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+91-9876543213', description: 'Teacher personal phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'TCH-2026-0001', description: 'Unique school employee identifier' })
  @IsString()
  @IsNotEmpty()
  employeeNumber: string;

  @ApiProperty({ example: 'Senior Mathematics Lecturer', description: 'Institutional designation', required: false })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiProperty({ example: 'M.Sc. in Applied Mathematics', description: 'Academic qualification details', required: false })
  @IsString()
  @IsOptional()
  qualification?: string;

  @ApiProperty({ example: '2026-06-01', description: 'Joining date in YYYY-MM-DD format', required: false })
  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @ApiProperty({ description: 'Branch UUID associated with this teacher', required: false })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ 
    example: { basicPay: 55000, houseRentAllowance: 15000, providentFund: 4500 }, 
    description: 'Salary structure setup details JSON model', 
    required: false 
  })
  @IsObject()
  @IsOptional()
  salaryStructure?: Record<string, any>;
}
