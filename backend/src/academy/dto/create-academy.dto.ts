import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateAcademyDto {
  @ApiProperty({ example: 'Apex Academy', description: 'Legal name of the academy institution' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'apex', description: 'Unique tenant subdomain identifier for routing (e.g. apex.hyvora.com)' })
  @IsString()
  @IsNotEmpty()
  subdomain: string;

  @ApiProperty({ example: 'apexacademy.com', description: 'Custom domain mapped to tenant instance', required: false })
  @IsString()
  @IsOptional()
  domain?: string;
}
