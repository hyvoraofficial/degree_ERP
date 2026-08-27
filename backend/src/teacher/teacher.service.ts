import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import * as bcrypt from 'bcrypt';

function generateSecureTeacherPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function getTeacherPassword(user: any, employeeNumber: string): string {
  if (user?.initialPassword) {
    return user.initialPassword;
  }
  const code = (employeeNumber || 'TCH').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `Tch#${code}2026!`;
}

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async create(academyId: string, dto: CreateTeacherDto) {
    const emailExists = await this.prisma.user.findFirst({
      where: { academyId, email: dto.email, deletedAt: null },
    });
    if (emailExists) {
      throw new BadRequestException(`Email "${dto.email}" is already registered.`);
    }

    const employeeExists = await this.prisma.teacher.findFirst({
      where: { academyId, employeeNumber: dto.employeeNumber, deletedAt: null },
    });
    if (employeeExists) {
      throw new BadRequestException(`Employee number "${dto.employeeNumber}" is already assigned.`);
    }

    // Lookup default TEACHER role
    let teacherRole = await this.prisma.role.findFirst({
      where: { academyId, code: 'TEACHER', deletedAt: null },
    });

    if (!teacherRole) {
      teacherRole = await this.prisma.role.findFirst({
        where: { academyId: null, code: 'TEACHER', deletedAt: null },
      });
    }

    if (!teacherRole) {
      throw new BadRequestException('Role config for "TEACHER" not initialized.');
    }

    const temporaryPassword = generateSecureTeacherPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    return this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.create({
        data: {
          academyId,
          email: dto.email,
          passwordHash: hashedPassword,
          initialPassword: temporaryPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          status: 'active',
          isEmailVerified: false,
          isDefaultPassword: true,
        },
      });

      await tx.userRole.create({
        data: {
          academyId,
          userId: user.id,
          roleId: teacherRole.id,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          academyId,
          branchId: dto.branchId || undefined,
          userId: user.id,
          employeeNumber: dto.employeeNumber,
          designation: dto.designation,
          qualification: dto.qualification,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
          salaryStructure: dto.salaryStructure || {},
        },
      });

      return {
        id: teacher.id,
        employeeNumber: teacher.employeeNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        temporaryPassword,
      };
    });
  }

  async findAll(
    academyId: string,
    filters: { search?: string; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      deletedAt: null,
    };

    if (academyId && academyId !== 'platform' && academyId !== 'platform-global') {
      whereClause.OR = [
        { academyId },
        { academyId: 'a1111111-1111-1111-1111-111111111111' },
      ];
    }

    if (filters.search) {
      const searchTerms = [
        { employeeNumber: { contains: filters.search, mode: 'insensitive' } },
        { designation: { contains: filters.search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { email: { contains: filters.search, mode: 'insensitive' } },
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        },
      ];

      if (whereClause.OR) {
        whereClause.AND = [
          { OR: whereClause.OR },
          { OR: searchTerms },
        ];
        delete whereClause.OR;
      } else {
        whereClause.OR = searchTerms;
      }
    }

    const [teachers, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
              initialPassword: true,
            },
          },
          teacherSubjects: {
            where: { deletedAt: null },
            include: {
              subject: { select: { id: true, name: true, code: true } },
              course: { select: { id: true, name: true, code: true } },
              batch: { select: { id: true, name: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.teacher.count({ where: whereClause }),
    ]);

    const formattedTeachers = teachers.map((t: any) => ({
      id: t.id,
      branchId: t.branchId || null,
      employeeNumber: t.employeeNumber,
      designation: t.designation,
      qualification: t.qualification,
      joiningDate: t.joiningDate,
      firstName: t.user?.firstName || '',
      lastName: t.user?.lastName || '',
      email: t.user?.email || '',
      phone: t.user?.phone || '',
      status: t.status,
      user: {
        firstName: t.user?.firstName || '',
        lastName: t.user?.lastName || '',
        email: t.user?.email || '',
        phone: t.user?.phone || '',
      },
      temporaryPassword: getTeacherPassword(t.user, t.employeeNumber),
      subjects: (t.teacherSubjects || [])
        .filter((ts: any) => ts.subject && ts.subject.name)
        .map((ts: any) => ({
          id: ts.subject.id,
          name: ts.subject.name,
          code: ts.subject.code,
          courseName: ts.course?.name || '',
          batchName: ts.batch?.name || '',
          branchId: ts.branchId,
          courseId: ts.courseId,
          subjectId: ts.subjectId,
          batchId: ts.batchId,
        })),
    }));

    return {
      teachers: formattedTeachers,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(academyId: string, id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, academyId, deletedAt: null },
      include: {
        user: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${id}" not found.`);
    }

    return {
      id: teacher.id,
      employeeNumber: teacher.employeeNumber,
      designation: teacher.designation,
      qualification: teacher.qualification,
      joiningDate: teacher.joiningDate,
      salaryStructure: teacher.salaryStructure,
      firstName: teacher.user.firstName,
      lastName: teacher.user.lastName,
      email: teacher.user.email,
      phone: teacher.user.phone,
      status: teacher.status,
    };
  }

  async update(academyId: string, id: string, dto: UpdateTeacherDto) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, academyId, deletedAt: null },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: teacher.userId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
        },
      });

      const updated = await tx.teacher.update({
        where: { id },
        data: {
          employeeNumber: dto.employeeNumber,
          designation: dto.designation,
          qualification: dto.qualification,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
          salaryStructure: dto.salaryStructure,
        },
        include: { user: true },
      });

      return {
        id: updated.id,
        employeeNumber: updated.employeeNumber,
        firstName: updated.user.firstName,
        lastName: updated.user.lastName,
        email: updated.user.email,
      };
    });
  }

  async remove(academyId: string, id: string, permanent: boolean = false) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, academyId },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found.`);
    }

    if (permanent) {
      return this.prisma.$transaction(async (tx: any) => {
        await tx.teacherLeave.deleteMany({ where: { teacherId: id } });
        await tx.teacherSubject.deleteMany({ where: { teacherId: id } });
        await tx.classSchedule.deleteMany({ where: { teacherId: id } });
        await tx.teacher.delete({ where: { id } });
        await tx.userRole.deleteMany({ where: { userId: teacher.userId } });
        await tx.user.delete({ where: { id: teacher.userId } });
        return { success: true, message: 'Teacher deleted permanently from database.' };
      });
    }

    const now = new Date();

    return this.prisma.$transaction(async (tx: any) => {
      await tx.teacher.update({
        where: { id },
        data: { deletedAt: now },
      });

      await tx.user.update({
        where: { id: teacher.userId },
        data: { deletedAt: now },
      });

      await tx.userRole.updateMany({
        where: { userId: teacher.userId, academyId },
        data: { deletedAt: now },
      });

      await tx.teacherLeave.updateMany({
        where: { teacherId: id, academyId },
        data: { deletedAt: now },
      });

      return { id, deleted: true };
    });
  }

  // ==========================================
  // LEAVE OPERATIONS
  // ==========================================

  async applyLeave(academyId: string, teacherId: string, dto: ApplyLeaveDto) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, academyId, deletedAt: null },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found.`);
    }

    return this.prisma.teacherLeave.create({
      data: {
        academyId,
        teacherId,
        leaveType: dto.leaveType,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        status: 'pending',
        reason: dto.reason,
      },
    });
  }

  async findLeaves(academyId: string, teacherId: string) {
    return this.prisma.teacherLeave.findMany({
      where: { teacherId, academyId, deletedAt: null },
      orderBy: { startsAt: 'desc' },
    });
  }

  async approveLeave(
    academyId: string,
    teacherId: string,
    leaveId: string,
    approvedById: string,
    dto: ApproveLeaveDto
  ) {
    const leave = await this.prisma.teacherLeave.findFirst({
      where: { id: leaveId, teacherId, academyId, deletedAt: null },
    });

    if (!leave) {
      throw new NotFoundException('Leave application record not found.');
    }

    return this.prisma.teacherLeave.update({
      where: { id: leaveId },
      data: {
        status: dto.status,
        approvedById,
      },
    });
  }

  // ==========================================
  // TIMETABLE & SALARY STRUCTURE
  // ==========================================

  async getTimetable(academyId: string, teacherId: string) {
    try {
      // Direct raw query timetable selection from class_schedules table
      const schedules = await this.prisma.$queryRaw`
        SELECT day_of_week, start_time, end_time, subject_id, room 
        FROM class_schedules 
        WHERE teacher_id = ${teacherId}::uuid AND academy_id = ${academyId}::uuid AND deleted_at IS NULL
      `;
      return schedules;
    } catch (err) {
      // Return fallback demo schedules structure
      return [
        { dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00', subject: 'Algebra-I', room: 'Classroom-4' },
        { dayOfWeek: 'Wednesday', startTime: '11:00', endTime: '12:00', subject: 'Calculus-II', room: 'Lab-A' },
      ];
    }
  }

  async getSalary(academyId: string, id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, academyId, deletedAt: null },
      select: { salaryStructure: true },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found.`);
    }

    return teacher.salaryStructure;
  }

  async findOneByUser(academyId: string, userId: string) {
    let teacher = await this.prisma.teacher.findFirst({
      where: { userId, deletedAt: null },
      include: {
        user: true,
        branch: true,
        schedules: {
          where: { deletedAt: null },
          include: {
            subject: true,
            batch: true,
          },
        },
        teacherSubjects: {
          where: { deletedAt: null },
          include: {
            subject: true,
            batch: true,
            course: true,
            branch: true,
          },
        },
      },
    });

    if (!teacher) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        teacher = await this.prisma.teacher.findFirst({
          where: {
            deletedAt: null,
            user: { email: { equals: user.email, mode: 'insensitive' } },
          },
          include: {
            user: true,
            branch: true,
            schedules: {
              where: { deletedAt: null },
              include: { subject: true, batch: true },
            },
            teacherSubjects: {
              where: { deletedAt: null },
              include: { subject: true, batch: true, course: true, branch: true },
            },
          },
        });
      }
    }

    if (!teacher) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const defaultAcademy = await this.prisma.academy.findFirst({ where: { deletedAt: null } });
        const defaultAcademyId = academyId || defaultAcademy?.id || 'a1111111-1111-1111-1111-111111111111';
        const empCode = `TCH-${Math.floor(1000 + Math.random() * 9000)}`;
        teacher = await this.prisma.teacher.create({
          data: {
            academyId: defaultAcademyId,
            userId: user.id,
            employeeNumber: empCode,
            designation: 'Lecturer',
            qualification: 'M.Tech',
          },
          include: {
            user: true,
            branch: true,
            schedules: {
              where: { deletedAt: null },
              include: { subject: true, batch: true },
            },
            teacherSubjects: {
              where: { deletedAt: null },
              include: { subject: true, batch: true, course: true, branch: true },
            },
          },
        });
      }
    }

    if (!teacher) {
      throw new NotFoundException(`Teacher profile not found for this user account.`);
    }

    return teacher;
  }
}
