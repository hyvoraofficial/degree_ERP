import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { LibraryService } from './library.service';
import { CreateBookDto, IssueBookDto } from './dto/library.dto';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../common/guards/rbac.guard';

@ApiTags('Library Management')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-Academy-Subdomain',
  description: 'Academy subdomain descriptor (e.g. hyvora)',
  required: true,
})
@UseGuards(TenantGuard, JwtAuthGuard, RbacGuard)
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('books')
  @ApiOperation({ summary: 'List library books' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  async findAllBooks(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('departmentId') departmentId?: string
  ) {
    const data = await this.libraryService.findAllBooks(req.tenant.id, search, departmentId);
    return {
      success: true,
      data,
      message: 'Library books retrieved successfully.',
    };
  }

  @Post('books')
  @ApiOperation({ summary: 'Add a new book to the library' })
  async createBook(@Req() req: any, @Body() dto: CreateBookDto) {
    const data = await this.libraryService.createBook(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Book added to library successfully.',
    };
  }

  @Post('issue')
  @ApiOperation({ summary: 'Issue a book to a student' })
  async issueBook(@Req() req: any, @Body() dto: IssueBookDto) {
    const data = await this.libraryService.issueBook(req.tenant.id, dto);
    return {
      success: true,
      data,
      message: 'Book issued successfully.',
    };
  }

  @Post('return/:issueId')
  @ApiOperation({ summary: 'Return an issued book' })
  @ApiParam({ name: 'issueId', description: 'Issue record UUID' })
  async returnBook(@Req() req: any, @Param('issueId') issueId: string) {
    const data = await this.libraryService.returnBook(req.tenant.id, issueId);
    return {
      success: true,
      data,
      message: 'Book returned successfully.',
    };
  }

  @Get('issued-logs')
  @ApiOperation({ summary: 'List all currently issued books' })
  async listIssuedBooks(@Req() req: any) {
    const data = await this.libraryService.listIssuedBooks(req.tenant.id);
    return {
      success: true,
      data,
      message: 'Issued books records retrieved.',
    };
  }
}
