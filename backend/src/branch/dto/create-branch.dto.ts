import { IsNotEmpty, IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchDto {
  @ApiProperty({ example: 'Electronic City', description: 'Name of the branch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'ECITY', description: 'Unique code of the branch' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: '123 Main St', description: 'Physical address of the branch' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Bengaluru', description: 'City where the branch is located' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Karnataka', description: 'State where the branch is located' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '560100', description: 'Pincode of the branch' })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiProperty({ example: '+91-9876543210', description: 'Contact number of the branch' })
  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @ApiProperty({ example: 'branch@academy.edu', description: 'Contact email of the branch' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '3ba29a28-98df-4a6f-a89c-567abed43011', description: 'Manager user ID (optional)', required: false })
  @IsString()
  @IsOptional()
  managerId?: string;

  @ApiProperty({ example: 'active', description: 'Branch status', enum: ['active', 'inactive'], required: false })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;
}
