import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@academy.edu', description: 'Registered email address to send password recovery instructions' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
