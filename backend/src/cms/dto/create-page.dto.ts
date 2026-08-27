import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum PageStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export class CreatePageDto {
  @ApiProperty({ example: 'About Us', description: 'Title header of CMS page' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'about-us', description: 'URL route slug path' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: { sections: [{ type: 'hero', heading: 'Welcome' }] }, description: 'JSON data structure for layout contents' })
  @IsObject()
  @IsNotEmpty()
  content: Record<string, any>;

  @ApiProperty({ example: 'draft', enum: PageStatus })
  @IsEnum(PageStatus)
  @IsNotEmpty()
  status: PageStatus;

  @ApiProperty({ example: 'About EduERP Platform', required: false })
  @IsString()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ example: 'SaaS portal describing academic values', required: false })
  @IsString()
  @IsOptional()
  metaDescription?: string;
}
