import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsEnum } from 'class-validator';

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive'
}

export class UpdateUserDto {
  @ApiProperty({ example: 'john.doe@academy.edu', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '+91-9876543212', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'active', enum: UserStatus, required: false })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}
