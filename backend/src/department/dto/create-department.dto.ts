import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ description: 'Department Name', example: 'Computer Science & Engineering' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Department Unique Code', example: 'CSE' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'Department Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Affiliated Campus/Branch UUID' })
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Assigned Head of Department (Teacher UUID)' })
  @IsUUID()
  @IsOptional()
  hodId?: string;
}

export class UpdateDepartmentDto extends CreateDepartmentDto {}
