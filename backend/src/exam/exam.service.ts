import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateExamPaperDto } from './dto/create-exam-paper.dto';
import { BulkMarksEntryDto } from './dto/bulk-marks-entry.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // EXAM CRUD OPERATIONS
  // ==========================================

  async createExam(academyId: string, dto: CreateExamDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start > end) {
      throw new BadRequestException('Start date cannot exceed end date.');
    }

    return this.prisma.exam.create({
      data: {
        academyId,
        name: dto.name,
        description: dto.description,
        examType: dto.examType,
        startDate: start,
        endDate: end,
      },
    });
  }

  async findAllExams(academyId: string) {
    return this.prisma.exam.findMany({
      where: { academyId, deletedAt: null },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOneExam(academyId: string, id: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, academyId, deletedAt: null },
      include: {
        papers: {
          where: { deletedAt: null },
          include: { subject: true, batch: true },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam schedule with ID "${id}" not found.`);
    }

    return exam;
  }

  async removeExam(academyId: string, id: string) {
    const exam = await this.findOneExam(academyId, id);
    const now = new Date();

    return this.prisma.$transaction(async (tx: any) => {
      await tx.exam.update({
        where: { id: exam.id },
        data: { deletedAt: now },
      });

      await tx.examPaper.updateMany({
        where: { examId: exam.id, academyId },
        data: { deletedAt: now },
      });

      return { id: exam.id, deleted: true };
    });
  }

  // ==========================================
  // EXAM PAPER CRUD OPERATIONS
  // ==========================================

  async createPaper(academyId: string, dto: CreateExamPaperDto) {
    // Validate exam schedule presence
    const exam = await this.prisma.exam.findFirst({
      where: { id: dto.examId, academyId, deletedAt: null },
    });
    if (!exam) throw new BadRequestException('Exam schedule is invalid or deactivated.');

    // Validate subject
    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, academyId, deletedAt: null },
    });
    if (!subject) throw new BadRequestException('Subject is invalid or deactivated.');

    // Validate batch
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, academyId, deletedAt: null },
    });
    if (!batch) throw new BadRequestException('Batch is invalid or deactivated.');

    if (dto.passingMarks > dto.maxMarks) {
      throw new BadRequestException('Passing marks cannot exceed max marks.');
    }

    return this.prisma.examPaper.create({
      data: {
        academyId,
        examId: dto.examId,
        subjectId: dto.subjectId,
        batchId: dto.batchId,
        examDate: new Date(dto.examDate),
        startTime: dto.startTime,
        durationMinutes: dto.durationMinutes,
        maxMarks: new Prisma.Decimal(dto.maxMarks.toString()),
        passingMarks: new Prisma.Decimal(dto.passingMarks.toString()),
        questionPaperId: dto.questionPaperId || null,
      },
    });
  }

  async findPapers(academyId: string, examId?: string, batchId?: string) {
    const whereClause: any = { academyId, deletedAt: null };
    if (examId) whereClause.examId = examId;
    if (batchId) whereClause.batchId = batchId;

    return this.prisma.examPaper.findMany({
      where: whereClause,
      include: {
        exam: true,
        subject: true,
        batch: true,
      },
      orderBy: { examDate: 'asc' },
    });
  }

  async findPapersBySubject(academyId: string, subjectId: string) {
    return this.prisma.examPaper.findMany({
      where: { academyId, subjectId, deletedAt: null },
      include: {
        exam: true,
        subject: true,
        batch: true,
      },
      orderBy: { examDate: 'asc' },
    });
  }

  async findPapersByBatch(academyId: string, batchId: string) {
    return this.prisma.examPaper.findMany({
      where: { academyId, batchId, deletedAt: null },
      include: {
        exam: true,
        subject: true,
        batch: true,
      },
      orderBy: { examDate: 'asc' },
    });
  }

  async findOnePaper(academyId: string, id: string) {
    const paper = await this.prisma.examPaper.findFirst({
      where: { id, academyId, deletedAt: null },
      include: {
        exam: true,
        subject: true,
        batch: true,
      },
    });

    if (!paper) {
      throw new NotFoundException(`Exam paper with ID "${id}" not found.`);
    }

    return paper;
  }

  async removePaper(academyId: string, id: string) {
    const paper = await this.findOnePaper(academyId, id);
    return this.prisma.examPaper.update({
      where: { id: paper.id },
      data: { deletedAt: new Date() },
    });
  }

  // ==========================================
  // MARKS ENTRY & GRADE COMPUTATION LOGIC
  // ==========================================

  async submitMarks(academyId: string, gradedBy: string, dto: BulkMarksEntryDto) {
    const paper = await this.prisma.examPaper.findFirst({
      where: { id: dto.examPaperId, academyId, deletedAt: null },
    });

    if (!paper) {
      throw new NotFoundException('Exam paper profile not found.');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const resultPromises = dto.marks.map((m: any) => {
        let status = m.status;
        let marksDecimal: Prisma.Decimal | null = null;

        if (m.marksObtained !== undefined && m.marksObtained !== null) {
          marksDecimal = new Prisma.Decimal(m.marksObtained.toString());
          if (marksDecimal.greaterThan(paper.maxMarks)) {
            throw new BadRequestException(`Marks obtained cannot exceed max marks of ${paper.maxMarks}.`);
          }
          // Compute status depending on passing score
          status = marksDecimal.greaterThanOrEqualTo(paper.passingMarks) ? 'pass' : 'fail';
        }

        return tx.examResult.upsert({
          where: {
            uq_exam_result: {
              examPaperId: dto.examPaperId,
              studentId: m.studentId,
            },
          },
          update: {
            marksObtained: marksDecimal,
            remarks: m.remarks,
            status,
            gradedBy,
            deletedAt: null,
          },
          create: {
            academyId,
            examPaperId: dto.examPaperId,
            studentId: m.studentId,
            marksObtained: marksDecimal,
            remarks: m.remarks,
            status,
            gradedBy,
          },
        });
      });

      await Promise.all(resultPromises);
      return { examPaperId: dto.examPaperId, recordsCount: dto.marks.length };
    });
  }

  // ==========================================
  // RANK CALCULATION
  // ==========================================

  async getExamRanks(academyId: string, examPaperId: string) {
    const results = await this.prisma.examResult.findMany({
      where: { examPaperId, academyId, deletedAt: null },
      include: {
        student: { include: { user: true } },
      },
      orderBy: { marksObtained: 'desc' },
    });

    return results.map((r: any, idx: number) => ({
      rank: idx + 1,
      studentId: r.studentId,
      firstName: r.student.user.firstName,
      lastName: r.student.user.lastName,
      admissionNumber: r.student.admissionNumber,
      marksObtained: r.marksObtained,
      status: r.status,
    }));
  }

  // ==========================================
  // REPORTS / GRADE MAPPING MOCK CALCULATOR
  // ==========================================

  private calculateGradeLetter(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }

  async getStudentReportCard(academyId: string, studentId: string, examId: string) {
    const results = await this.prisma.examResult.findMany({
      where: {
        academyId,
        studentId,
        deletedAt: null,
        examPaper: {
          examId,
          deletedAt: null,
        },
      },
      include: {
        examPaper: {
          include: { subject: true },
        },
      },
    });

    let totalMax = 0;
    let totalObtained = 0;

    const subjectsCard = results.map((r: any) => {
      const max = parseFloat(r.examPaper.maxMarks.toString());
      const obtained = r.marksObtained ? parseFloat(r.marksObtained.toString()) : 0;
      totalMax += max;
      totalObtained += obtained;

      const pct = max > 0 ? (obtained / max) * 100 : 0;

      return {
        subjectName: r.examPaper.subject.name,
        maxMarks: max,
        obtainedMarks: obtained,
        percentage: parseFloat(pct.toFixed(2)),
        status: r.status,
        gradeLetter: this.calculateGradeLetter(pct),
      };
    });

    const averagePct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    return {
      studentId,
      examId,
      summary: {
        totalMaxMarks: totalMax,
        totalObtainedMarks: totalObtained,
        averagePercentage: parseFloat(averagePct.toFixed(2)),
        finalGrade: this.calculateGradeLetter(averagePct),
        resultStatus: averagePct >= 40 ? 'pass' : 'fail',
      },
      reportDetails: subjectsCard,
    };
  }

  async findAllResults(academyId: string, filters: { courseId?: string; batchId?: string; examId?: string } = {}) {
    const where: any = {
      academyId,
      deletedAt: null,
    };

    if (filters.examId) {
      where.examPaper = { examId: filters.examId, deletedAt: null };
    }

    if (filters.batchId) {
      where.examPaper = { ...where.examPaper, batchId: filters.batchId };
    }

    const results = await this.prisma.examResult.findMany({
      where,
      include: {
        student: {
          include: {
            user: true,
            course: true,
            batch: true,
          },
        },
        examPaper: {
          include: {
            exam: true,
            subject: true,
            batch: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return results.map((r: any) => {
      const maxMarks = r.examPaper?.maxMarks ? parseFloat(r.examPaper.maxMarks.toString()) : 100;
      const obtained = r.marksObtained ? parseFloat(r.marksObtained.toString()) : 0;
      const pct = maxMarks > 0 ? (obtained / maxMarks) * 100 : 0;

      return {
        id: r.id,
        studentId: r.studentId,
        studentName: `${r.student?.user?.firstName || ''} ${r.student?.user?.lastName || ''}`.trim(),
        admissionNumber: r.student?.admissionNumber || '',
        rollNumber: r.student?.rollNumber || r.student?.universityRegNumber || '',
        courseName: r.student?.course?.name || '',
        batchName: r.student?.batch?.name || r.examPaper?.batch?.name || '',
        examTitle: r.examPaper?.exam?.name || 'End-Term Examination',
        subjectName: r.examPaper?.subject?.name || '',
        subjectCode: r.examPaper?.subject?.code || '',
        marksObtained: obtained,
        maxMarks: maxMarks,
        percentage: parseFloat(pct.toFixed(1)),
        grade: this.calculateGradeLetter(pct),
        status: r.status || (pct >= 40 ? 'pass' : 'fail'),
        remarks: r.remarks || 'Graded by Department Faculty',
      };
    });
  }

  async findAllSemesterGrades(academyId: string, filters: { studentId?: string; courseId?: string; semester?: number } = {}) {
    const where: any = {
      academyId,
      deletedAt: null,
    };

    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.semester) where.semester = filters.semester;

    return this.prisma.studentSemesterGrade.findMany({
      where,
      include: {
        student: {
          include: {
            user: true,
            course: true,
            batch: true,
          },
        },
        course: true,
      },
      orderBy: [
        { semester: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }
}
