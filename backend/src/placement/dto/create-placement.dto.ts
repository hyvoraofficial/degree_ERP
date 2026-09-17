import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreatePlacementDriveDto {
  @ApiProperty({ description: 'Hiring Organization / Company Name', example: 'Google Cloud' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Role Title', example: 'Associate Cloud Engineer' })
  @IsString()
  @IsNotEmpty()
  jobRole: string;

  @ApiProperty({ description: 'Annual CTC Package in LPA', example: 18.5 })
  @IsNumber()
  @IsNotEmpty()
  packageLpa: number;

  @ApiPropertyOptional({ description: 'Eligibility Criteria' })
  @IsString()
  @IsOptional()
  eligibilityCriteria?: string;

  @ApiPropertyOptional({ description: 'Drive Date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  driveDate?: string;

  @ApiPropertyOptional({ description: 'Application Deadline (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  deadlineDate?: string;

  @ApiPropertyOptional({ description: 'Job Location' })
  @IsString()
  @IsOptional()
  location?: string;
}

export class ApplyPlacementDto {
  @ApiProperty({ description: 'Student UUID' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ description: 'Remarks / Cover Note' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
