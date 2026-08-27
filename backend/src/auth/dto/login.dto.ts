import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@academy.edu', description: 'User login email address or username' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!', description: 'User account password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'ACADEMY_ADMIN', description: 'Access portal role code' })
  @IsString()
  @IsNotEmpty()
  role: string;
}
