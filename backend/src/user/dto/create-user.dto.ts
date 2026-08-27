import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsArray, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe@academy.edu', description: 'Unique user email address' })
  @IsEmail({}, { message: 'Invalid email address format.' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Account password credentials' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+91-9876543212', description: 'User contact phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: ['TEACHER'], description: 'List of role codes to assign to the user' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  roleCodes: string[];
}
