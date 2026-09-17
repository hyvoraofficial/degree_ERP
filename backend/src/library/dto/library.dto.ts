import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsUUID, Min } from 'class-validator';

export class CreateBookDto {
  @ApiProperty({ description: 'Book Title', example: 'Introduction to Algorithms' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'ISBN Number', example: '978-0262033848' })
  @IsString()
  @IsOptional()
  isbn?: string;

  @ApiProperty({ description: 'Author name(s)', example: 'Thomas H. Cormen' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiPropertyOptional({ description: 'Category', example: 'Computer Science' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Publisher', example: 'MIT Press' })
  @IsString()
  @IsOptional()
  publisher?: string;

  @ApiPropertyOptional({ description: 'Department UUID' })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Total Copies', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  totalCopies?: number;

  @ApiPropertyOptional({ description: 'Shelf / Rack location', example: 'Stack CS-Row 4-A' })
  @IsString()
  @IsOptional()
  shelfLocation?: string;
}

export class IssueBookDto {
  @ApiProperty({ description: 'Book UUID' })
  @IsUUID()
  @IsNotEmpty()
  bookId: string;

  @ApiProperty({ description: 'Student UUID' })
  @IsUUID()
  @IsNotEmpty()
  studentId: string;

  @ApiPropertyOptional({ description: 'Days until return due', default: 14 })
  @IsInt()
  @IsOptional()
  dueDays?: number;
}
