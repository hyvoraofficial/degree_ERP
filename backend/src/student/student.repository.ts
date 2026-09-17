import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AssignBatchDto } from './dto/assign-batch.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

function generateSecurePassword(): string {
  const length = Math.floor(Math.random() * 5) + 12; // 12 to 16 characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

function getStudentPassword(user: any, admissionNumber: string): string {
  if (user?.initialPassword) {
    return user.initialPassword;
  }
  const code = (admissionNumber || 'STD').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `Std#${code}2026!`;
}

@Injectable()
export class StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    academyId: string,
    filters: { search?: string; status?: string; branchId?: string; courseId?: string; batchId?: string; limit?: number; page?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      academyId,
      deletedAt: null,
    };

    if (filters.branchId) {
      whereClause.branchId = filters.branchId;
    }
    if (filters.courseId) {
      whereClause.courseId = filters.courseId;
    }
    if (filters.batchId) {
      whereClause.batchId = filters.batchId;
    }
    if (filters.status) {
      whereClause.user = {
        ...whereClause.user,
        status: filters.status,
      };
    }
    if (filters.search) {
      whereClause.OR = [
        { admissionNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              lastLoginAt: true,
              initialPassword: true,
            },
          },
          branch: true,
          course: true,
          batch: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.student.count({ where: whereClause }),
    ]);

    const formattedStudents = students.map((std: any) => ({
      id: std.id,
      admissionNumber: std.admissionNumber,
      admissionDate: std.admissionDate,
      dateOfBirth: std.dateOfBirth,
      gender: std.gender,
      bloodGroup: std.bloodGroup,
      parentName: std.parentName,
      parentPhone: std.parentPhone,
      parentEmail: std.parentEmail,
      fatherName: std.fatherName,
      motherName: std.motherName,
      rollNumber: std.rollNumber,
      feePlan: std.feePlan,
      studentPhotoId: std.studentPhotoId,
      aadhaarId: std.aadhaarId,
      previousMarksCardId: std.previousMarksCardId,
      firstName: std.user.firstName,
      lastName: std.user.lastName,
      email: std.user.email,
      phone: std.user.phone,
      status: std.user.status,
      lastLoginAt: std.user.lastLoginAt,
      temporaryPassword: getStudentPassword(std.user, std.admissionNumber),
      createdAt: std.createdAt,
      updatedAt: std.updatedAt,
      branch: std.branch ? { id: std.branch.id, name: std.branch.name, code: std.branch.code } : null,
      course: std.course ? { id: std.course.id, name: std.course.name, code: std.course.code } : null,
      batch: std.batch ? { id: std.batch.id, name: std.batch.name } : null,
    }));

    return {
      students: formattedStudents,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findById(academyId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        id,
        academyId,
        deletedAt: null,
      },
      include: {
        user: true,
        branch: true,
        course: true,
        batch: true,
      },
    });

    if (!student) return null;

    return {
      id: student.id,
      admissionNumber: student.admissionNumber,
      admissionDate: student.admissionDate,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      bloodGroup: student.bloodGroup,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      fatherName: student.fatherName,
      motherName: student.motherName,
      rollNumber: student.rollNumber,
      feePlan: student.feePlan,
      studentPhotoId: student.studentPhotoId,
      aadhaarId: student.aadhaarId,
      previousMarksCardId: student.previousMarksCardId,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      email: student.user.email,
      phone: student.user.phone,
      status: student.user.status,
      lastLoginAt: student.user.lastLoginAt,
      temporaryPassword: getStudentPassword(student.user, student.admissionNumber),
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      branch: student.branch ? { id: student.branch.id, name: student.branch.name, code: student.branch.code } : null,
      course: student.course ? { id: student.course.id, name: student.course.name, code: student.course.code } : null,
      batch: student.batch ? { id: student.batch.id, name: student.batch.name } : null,
    };
  }

  async findByUser(academyId: string, userId: string) {
    let student = await this.prisma.student.findFirst({
      where: {
        userId,
        deletedAt: null,
        ...(academyId && academyId !== 'platform' ? { academyId } : {}),
      },
      include: {
        user: true,
        branch: true,
        course: true,
        batch: true,
      },
    });

    if (!student) {
      student = await this.prisma.student.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
          user: true,
          branch: true,
          course: true,
          batch: true,
        },
      });
    }

    if (!student) return null;

    return {
      id: student.id,
      admissionNumber: student.admissionNumber,
      admissionDate: student.admissionDate,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      bloodGroup: student.bloodGroup,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      parentEmail: student.parentEmail,
      fatherName: student.fatherName,
      motherName: student.motherName,
      rollNumber: student.rollNumber,
      feePlan: student.feePlan,
      studentPhotoId: student.studentPhotoId,
      aadhaarId: student.aadhaarId,
      previousMarksCardId: student.previousMarksCardId,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      email: student.user.email,
      phone: student.user.phone,
      status: student.user.status,
      lastLoginAt: student.user.lastLoginAt,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
      branch: student.branch ? { id: student.branch.id, name: student.branch.name, code: student.branch.code } : null,
      course: student.course ? { id: student.course.id, name: student.course.name, code: student.course.code } : null,
      batch: student.batch ? { id: student.batch.id, name: student.batch.name } : null,
    };
  }

  async create(academyId: string, dto: CreateStudentDto) {
    // Assert email uniqueness in academy space
    const emailExists = await this.prisma.user.findFirst({
      where: { academyId, email: dto.email, deletedAt: null },
    });
    if (emailExists) {
      throw new BadRequestException(`Email "${dto.email}" is already registered in this Academy.`);
    }

    // Verify branch, course, batch
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, academyId, deletedAt: null },
    });
    if (!branch) {
      throw new BadRequestException('The selected Branch is invalid or inactive.');
    }

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, branchId: dto.branchId, academyId, deletedAt: null },
    });
    if (!course) {
      throw new BadRequestException('The selected Course is invalid or does not belong to the selected Branch.');
    }

    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, branchId: dto.branchId, academyId, deletedAt: null },
    });
    if (!batch) {
      throw new BadRequestException('The selected Batch is invalid or does not belong to the selected Branch.');
    }

    const admissionNum = dto.admissionNumber || `ADM-${Date.now()}`;
    const admissionExists = await this.prisma.student.findFirst({
      where: { academyId, admissionNumber: admissionNum, deletedAt: null },
    });
    if (admissionExists) {
      throw new BadRequestException(`Admission number "${admissionNum}" is already assigned.`);
    }

    // Retrieve default STUDENT role
    let studentRole = await this.prisma.role.findFirst({
      where: { academyId, code: 'STUDENT', deletedAt: null },
    });
    if (!studentRole) {
      studentRole = await this.prisma.role.findFirst({
        where: { academyId: null, code: 'STUDENT', deletedAt: null },
      });
    }
    if (!studentRole) {
      throw new BadRequestException('STUDENT role not initialized.');
    }

    const temporaryPassword = generateSecurePassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Create primary auth user
      const user = await tx.user.create({
        data: {
          academyId,
          email: dto.email,
          passwordHash,
          initialPassword: temporaryPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone || dto.parent.phone,
          status: 'active',
          isEmailVerified: false,
          isDefaultPassword: true,
        },
      });

      // 2. Assign STUDENT role
      await tx.userRole.create({
        data: {
          academyId,
          userId: user.id,
          roleId: studentRole.id,
        },
      });

      // 3. Create student profile
      const parentName = `${dto.parent.fatherName} & ${dto.parent.motherName}`;
      const student = await tx.student.create({
        data: {
          academyId,
          userId: user.id,
          branchId: dto.branchId,
          courseId: dto.courseId,
          batchId: dto.batchId,
          admissionNumber: admissionNum,
          admissionDate: new Date(),
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : new Date(),
          gender: dto.gender || 'male',
          bloodGroup: dto.bloodGroup || null,
          parentName,
          parentPhone: dto.parent.phone,
          parentEmail: dto.parent.email || null,
          fatherName: dto.parent.fatherName,
          motherName: dto.parent.motherName,
          rollNumber: dto.rollNumber || null,
          feePlan: dto.feePlan || null,
          studentPhotoId: dto.documents?.studentPhotoId || null,
          aadhaarId: dto.documents?.aadhaarId || null,
          previousMarksCardId: dto.documents?.previousMarksCardId || null,
        },
      });

      return {
        id: student.id,
        admissionNumber: student.admissionNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        temporaryPassword,
        branchName: branch.name,
      };
    });
  }

  async update(academyId: string, id: string, dto: UpdateStudentDto) {
    const student = await this.prisma.student.findFirst({
      where: { id, academyId, deletedAt: null },
    });

    if (!student) {
      throw new BadRequestException('Student profile not found.');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Update user fields
      await tx.user.update({
        where: { id: student.userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
        },
      });

      // 2. Update student fields
      const updated = await tx.student.update({
        where: { id },
        data: {
          branchId: dto.branchId,
          courseId: dto.courseId,
          batchId: dto.batchId,
          admissionNumber: dto.admissionNumber,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          parentName: dto.parent ? `${dto.parent.fatherName} & ${dto.parent.motherName}` : undefined,
          parentPhone: dto.parent?.phone,
          parentEmail: dto.parent?.email,
          fatherName: dto.parent?.fatherName,
          motherName: dto.parent?.motherName,
          rollNumber: dto.rollNumber,
          feePlan: dto.feePlan,
          studentPhotoId: dto.documents?.studentPhotoId,
          aadhaarId: dto.documents?.aadhaarId,
          previousMarksCardId: dto.documents?.previousMarksCardId,
        },
        include: { user: true },
      });

      return {
        id: updated.id,
        admissionNumber: updated.admissionNumber,
        firstName: updated.user.firstName,
        lastName: updated.user.lastName,
        email: updated.user.email,
      };
    });
  }

  async remove(academyId: string, id: string, permanent: boolean = false) {
    const student = await this.prisma.student.findFirst({
      where: { id, academyId },
    });

    if (!student) {
      throw new BadRequestException('Student profile not found.');
    }

    if (permanent) {
      return this.prisma.$transaction(async (tx: any) => {
        await tx.studentAttendance.deleteMany({ where: { studentId: id } });
        await tx.assignmentSubmission.deleteMany({ where: { studentId: id } });
        await tx.examResult.deleteMany({ where: { studentId: id } });
        await tx.feeAllocation.deleteMany({ where: { studentId: id } });
        await tx.student.delete({ where: { id } });
        await tx.userRole.deleteMany({ where: { userId: student.userId } });
        await tx.user.delete({ where: { id: student.userId } });
        return { success: true, message: 'Student profile permanently deleted from database.' };
      });
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx: any) => {
      await tx.student.update({
        where: { id },
        data: { deletedAt: now },
      });

      await tx.user.update({
        where: { id: student.userId },
        data: { deletedAt: now },
      });

      await tx.userRole.updateMany({
        where: { userId: student.userId, academyId },
        data: { deletedAt: now },
      });

      return { id, deletedAt: now };
    });
  }

  async assignBatch(academyId: string, studentId: string, dto: AssignBatchDto) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, academyId, deletedAt: null }
    });
    if (!student) {
      throw new BadRequestException('Student profile not found.');
    }

    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, academyId, deletedAt: null }
    });
    if (!batch) {
      throw new BadRequestException('Target batch not found or inactive.');
    }

    return this.prisma.student.update({
      where: { id: studentId },
      data: {
        batchId: dto.batchId,
        rollNumber: dto.rollNumber || student.rollNumber
      }
    });
  }

  async getAttendanceSummary(academyId: string, studentId: string) {
    try {
      const rawRecords: any[] = await this.prisma.$queryRaw`
        SELECT 
          s.id::text as "subjectId",
          s.name as "subjectName",
          s.code as "subjectCode",
          ar.status,
          COUNT(*)::int as count
        FROM attendance_records ar
        JOIN attendance a ON ar.attendance_id = a.id
        JOIN subjects s ON a.subject_id = s.id
        WHERE ar.student_id = ${studentId}::uuid 
          AND ar.academy_id = ${academyId}::uuid 
          AND ar.deleted_at IS NULL 
          AND a.deleted_at IS NULL
          AND s.deleted_at IS NULL
        GROUP BY s.id, s.name, s.code, ar.status
      `;

      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { courseId: true },
      });
      
      const courseSubjects = student?.courseId ? await this.prisma.subject.findMany({
        where: { courseId: student.courseId, deletedAt: null },
      }) : [];

      const subjectsMap: Record<string, { id: string; name: string; code: string; present: number; absent: number }> = {};
      courseSubjects.forEach(s => {
        subjectsMap[s.id] = {
          id: s.id,
          name: s.name,
          code: s.code,
          present: 0,
          absent: 0,
        };
      });

      rawRecords.forEach((r: any) => {
        if (!subjectsMap[r.subjectId]) {
          subjectsMap[r.subjectId] = {
            id: r.subjectId,
            name: r.subjectName,
            code: r.subjectCode,
            present: 0,
            absent: 0,
          };
        }
        const status = r.status === 'present' ? 'present' : 'absent';
        if (status === 'present') {
          subjectsMap[r.subjectId].present += r.count;
        } else {
          subjectsMap[r.subjectId].absent += r.count;
        }
      });

      const subjectsList = Object.values(subjectsMap).map(sub => {
        const total = sub.present + sub.absent;
        const percentage = total > 0 ? Number(((sub.present / total) * 100).toFixed(1)) : 100.0;
        return {
          ...sub,
          total,
          percentage,
        };
      });

      const overallPresent = subjectsList.reduce((sum, s) => sum + s.present, 0);
      const overallAbsent = subjectsList.reduce((sum, s) => sum + s.absent, 0);
      const overallTotal = overallPresent + overallAbsent;
      const overallPercentage = overallTotal > 0 ? Number(((overallPresent / overallTotal) * 100).toFixed(1)) : 100.0;

      return {
        overall: {
          present: overallPresent,
          absent: overallAbsent,
          total: overallTotal,
          percentage: overallPercentage,
        },
        subjects: subjectsList,
      };
    } catch (err) {
      return {
        overall: { present: 0, absent: 0, total: 0, percentage: 100.0 },
        subjects: []
      };
    }
  }

  async getFeeSummary(academyId: string, studentId: string) {
    try {
      const allocations = await this.prisma.feeAllocation.findMany({
        where: { studentId, academyId, deletedAt: null },
        include: {
          payments: {
            where: { deletedAt: null },
          },
        },
      });

      let totalAllocated = 0;
      let totalPaid = 0;

      allocations.forEach((alloc: any) => {
        totalAllocated += alloc.totalAmount ? parseFloat(alloc.totalAmount.toString()) : 0;
        alloc.payments?.forEach((p: any) => {
          totalPaid += parseFloat(p.amountPaid.toString());
        });
      });

      return {
        totalAllocated,
        totalPaid,
        totalBalance: Math.max(0, totalAllocated - totalPaid),
      };
    } catch (err) {
      return {
        totalAllocated: 0,
        totalPaid: 0,
        totalBalance: 0,
      };
    }
  }

  async updatePhoto(academyId: string, studentId: string, avatarId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, academyId, deletedAt: null },
    });

    if (!student) {
      throw new BadRequestException('Student profile not found.');
    }

    await this.prisma.user.update({
      where: { id: student.userId },
      data: { avatarId },
    });

    return { id: studentId, avatarId };
  }
}
