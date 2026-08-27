import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WHATSAPP = 'whatsapp',
  IN_APP = 'in_app'
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'WELCOME_USER', description: 'Name key identifying the template' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Welcome to EduERP!', required: false })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: 'Hello {{firstName}}, your ERP portal account is active.', description: 'Template body containing bracket variables' })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({ example: 'email', enum: NotificationType })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;
}
