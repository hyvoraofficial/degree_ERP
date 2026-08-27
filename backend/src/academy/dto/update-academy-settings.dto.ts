import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsHexColor, IsEmail } from 'class-validator';

export class UpdateAcademySettingsDto {
  @ApiProperty({ example: '#4F46E5', description: 'Institutional primary color code (HEX format)', required: false })
  @IsHexColor({ message: 'Primary color must be a valid HEX color code.' })
  @IsOptional()
  primaryColor?: string;

  @ApiProperty({ example: '#06B6D4', description: 'Institutional secondary color code (HEX format)', required: false })
  @IsHexColor({ message: 'Secondary color must be a valid HEX color code.' })
  @IsOptional()
  secondaryColor?: string;

  @ApiProperty({ example: '123 Academy Lane, Science City', description: 'Physical mailing address details', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: '+91-9876543210', description: 'Academy contact phone number', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'contact@academy.edu', description: 'Academy contact email address', required: false })
  @IsEmail({}, { message: 'Invalid contact email format.' })
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Asia/Kolkata', description: 'Academy default regional timezone parameter', required: false })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ example: 'INR', description: 'Academy default regional payment currency', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'dark', description: 'Default CSS theme setting (light/dark/system)', required: false })
  @IsString()
  @IsOptional()
  theme?: string;

  @ApiProperty({ example: 'f1111111-1111-1111-1111-111111111111', description: 'Logo media file ID', required: false })
  @IsString()
  @IsOptional()
  logoId?: string;

  @ApiProperty({ example: 'f2222222-2222-2222-2222-222222222222', description: 'Favicon media file ID', required: false })
  @IsString()
  @IsOptional()
  faviconId?: string;
}
