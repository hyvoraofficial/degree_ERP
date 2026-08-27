import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsObject } from 'class-validator';

export class TriggerTemplateDto {
  @ApiProperty({ example: 'u1111111-1111-1111-1111-111111111111', description: 'Recipient User UUID' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'WELCOME_USER', description: 'Template name code' })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiProperty({ example: { firstName: 'Suresh', portalLink: 'https://demo.hyvora.com' } })
  @IsObject()
  @IsNotEmpty()
  variables: Record<string, string>;
}
