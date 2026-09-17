import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookDto, IssueBookDto } from './dto/library.dto';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllBooks(academyId: string, search?: string, departmentId?: string) {
    const where: any = { academyId, deletedAt: null };
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.libraryBook.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { issues: { where: { status: 'issued' } } } },
      },
      orderBy: { title: 'asc' },
    });
  }

  async createBook(academyId: string, dto: CreateBookDto) {
    const copies = dto.totalCopies || 1;
    return this.prisma.libraryBook.create({
      data: {
        academyId,
        title: dto.title,
        isbn: dto.isbn,
        author: dto.author,
        category: dto.category,
        publisher: dto.publisher,
        departmentId: dto.departmentId,
        totalCopies: copies,
        availableCopies: copies,
        shelfLocation: dto.shelfLocation,
        status: 'available',
      },
    });
  }

  async issueBook(academyId: string, dto: IssueBookDto) {
    const book = await this.prisma.libraryBook.findFirst({
      where: { id: dto.bookId, academyId, deletedAt: null },
    });

    if (!book) throw new NotFoundException('Book not found.');
    if (book.availableCopies <= 0) {
      throw new BadRequestException('No available copies remaining for this book.');
    }

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, academyId, deletedAt: null },
    });
    if (!student) throw new NotFoundException('Student record not found.');

    const dueDays = dto.dueDays || 14;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + dueDays);

    const [issueRecord] = await this.prisma.$transaction([
      this.prisma.bookIssueRecord.create({
        data: {
          academyId,
          bookId: dto.bookId,
          studentId: dto.studentId,
          dueDate,
          status: 'issued',
        },
      }),
      this.prisma.libraryBook.update({
        where: { id: dto.bookId },
        data: {
          availableCopies: { decrement: 1 },
          status: book.availableCopies - 1 <= 0 ? 'borrowed_out' : 'available',
        },
      }),
    ]);

    return issueRecord;
  }

  async returnBook(academyId: string, issueId: string) {
    const record = await this.prisma.bookIssueRecord.findFirst({
      where: { id: issueId, academyId, status: 'issued' },
    });

    if (!record) throw new NotFoundException('Active book issue record not found.');

    await this.prisma.$transaction([
      this.prisma.bookIssueRecord.update({
        where: { id: issueId },
        data: {
          returnDate: new Date(),
          status: 'returned',
        },
      }),
      this.prisma.libraryBook.update({
        where: { id: record.bookId },
        data: {
          availableCopies: { increment: 1 },
          status: 'available',
        },
      }),
    ]);

    return { message: 'Book returned successfully.' };
  }

  async listIssuedBooks(academyId: string) {
    return this.prisma.bookIssueRecord.findMany({
      where: { academyId, status: 'issued' },
      include: {
        book: { select: { title: true, isbn: true, author: true } },
        student: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            course: { select: { code: true } },
          },
        },
      },
      orderBy: { issueDate: 'desc' },
    });
  }
}
