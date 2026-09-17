import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitStudentAttendanceDto } from './dto/submit-student-attendance.dto';
import { SubmitTeacherAttendanceDto } from './dto/submit-teacher-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // STUDENT ATTENDANCE OPERATIONS
  // ==========================================

  async submitStudentAttendance(academyId: string, teacherUserId: string, dto: SubmitStudentAttendanceDto) {
    const attendanceDate = new Date(dto.date);

    return this.prisma.$transaction(async (tx: any) => {
      // Resolve Teacher ID from User ID
      const teacherRecord = await tx.teacher.findFirst({
        where: { userId: teacherUserId, academyId, deletedAt: null },
      });
      
      let resolvedTeacherId = teacherRecord?.id;
      if (!resolvedTeacherId) {
        const fallbackTeacher = await tx.teacher.findFirst({
          where: { academyId, deletedAt: null },
        });
        resolvedTeacherId = fallbackTeacher?.id;
      }

      if (!resolvedTeacherId) {
        throw new BadRequestException('No active teacher profile exists to log attendance.');
      }

      // 1. Upsert principal attendance session record
      const attendance = await tx.attendance.upsert({
        where: {
          uq_attendance_session: {
            batchId: dto.batchId,
            date: attendanceDate,
            subjectId: dto.subjectId || null,
          },
        },
        update: {
          teacherId: resolvedTeacherId,
        },
        create: {
          academyId,
          batchId: dto.batchId,
          subjectId: dto.subjectId || null,
          teacherId: resolvedTeacherId,
          date: attendanceDate,
        },
      });

      // 2. Map student records
      const recordPromises = dto.records.map((r: any) => 
        tx.attendanceRecord.upsert({
          where: {
            uq_attendance_record: {
              attendanceId: attendance.id,
              studentId: r.studentId,
            },
          },
          update: {
            status: r.status,
            remarks: r.remarks,
            deletedAt: null,
          },
          create: {
            academyId,
            attendanceId: attendance.id,
            studentId: r.studentId,
            status: r.status,
            remarks: r.remarks,
          },
        })
      );

      await Promise.all(recordPromises);
      return { attendanceId: attendance.id, date: dto.date, recordsCount: dto.records.length };
    });
  }

  async getStudentAttendanceReport(academyId: string, batchId: string, date: string, subjectId?: string) {
    const where: any = {
      academyId,
      batchId,
      date: new Date(date),
      deletedAt: null,
    };
    if (subjectId) where.subjectId = subjectId;

    const attendance = await this.prisma.attendance.findFirst({
      where,
      include: {
        records: {
          include: {
            student: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!attendance) return [];

    return attendance.records.map((r: any) => ({
      studentId: r.studentId,
      firstName: r.student.user?.firstName || '',
      lastName: r.student.user?.lastName || '',
      admissionNumber: r.student.admissionNumber,
      status: r.status,
      remarks: r.remarks,
    }));
  }

  async getStudentMonthlyReport(academyId: string, studentId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        studentId,
        attendance: {
          academyId,
          deletedAt: null,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        attendance: {
          include: { batch: true },
        },
      },
    });

    const summary = { present: 0, absent: 0, late: 0, excused: 0 };
    records.forEach((r: any) => {
      if (r.status in summary) {
        summary[r.status as keyof typeof summary]++;
      }
    });

    const details = records.map((r: any) => ({
      date: r.attendance.date.toISOString().split('T')[0],
      batchName: r.attendance.batch.name,
      status: r.status,
      remarks: r.remarks,
    }));

    return {
      studentId,
      year,
      month,
      summary,
      details,
    };
  }

  async getStudentSubjectWiseAttendance(academyId: string, studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, academyId, deletedAt: null },
      include: {
        course: {
          include: {
            subjects: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!student || !student.course) {
      return { studentId, courseName: '', overallPercentage: 0, subjectStats: [] };
    }

    const subjects = student.course.subjects;
    let totalPresentSum = 0;
    let totalSessionsSum = 0;

    const subjectStats = await Promise.all(
      subjects.map(async (subj: any) => {
        const records = await this.prisma.attendanceRecord.findMany({
          where: {
            studentId,
            attendance: {
              academyId,
              subjectId: subj.id,
              deletedAt: null,
            },
          },
        });

        const totalSessions = records.length;
        const presentCount = records.filter((r: any) => r.status === 'present' || r.status === 'late').length;
        const percentage = totalSessions > 0 ? parseFloat(((presentCount / totalSessions) * 100).toFixed(1)) : 100;

        totalSessionsSum += totalSessions;
        totalPresentSum += presentCount;

        return {
          subjectId: subj.id,
          subjectName: subj.name,
          subjectCode: subj.code,
          totalSessions,
          presentCount,
          absentCount: totalSessions - presentCount,
          percentage,
        };
      })
    );

    const overallPercentage = totalSessionsSum > 0
      ? parseFloat(((totalPresentSum / totalSessionsSum) * 100).toFixed(1))
      : 100;

    return {
      studentId,
      courseName: student.course.name,
      overallPercentage,
      subjectStats,
    };
  }

  // ==========================================
  // TEACHER ATTENDANCE OPERATIONS
  // ==========================================

  async submitTeacherAttendance(academyId: string, dto: SubmitTeacherAttendanceDto) {
    const attendanceDate = new Date(dto.date);

    return this.prisma.$transaction(async (tx: any) => {
      const recordPromises = dto.records.map((r: any) =>
        tx.teacherAttendance.upsert({
          where: {
            uq_teacher_attendance: {
              teacherId: r.teacherId,
              date: attendanceDate,
            },
          },
          update: {
            status: r.status,
            remarks: r.remarks,
            deletedAt: null,
          },
          create: {
            academyId,
            teacherId: r.teacherId,
            date: attendanceDate,
            status: r.status,
            remarks: r.remarks,
          },
        })
      );

      await Promise.all(recordPromises);
      return { date: dto.date, recordsCount: dto.records.length };
    });
  }

  async getTeacherAttendanceReport(academyId: string, date: string) {
    const records = await this.prisma.teacherAttendance.findMany({
      where: {
        academyId,
        date: new Date(date),
        deletedAt: null,
      },
      include: {
        teacher: {
          include: { user: true },
        },
      },
    });

    return records.map((r: any) => ({
      teacherId: r.teacherId,
      firstName: r.teacher.user.firstName,
      lastName: r.teacher.user.lastName,
      employeeNumber: r.teacher.employeeNumber,
      status: r.status,
      remarks: r.remarks,
    }));
  }

  async getTeacherMonthlyReport(academyId: string, teacherId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.prisma.teacherAttendance.findMany({
      where: {
        academyId,
        teacherId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
    });

    const summary = { present: 0, absent: 0, late: 0, half_day: 0 };
    records.forEach((r: any) => {
      if (r.status in summary) {
        summary[r.status as keyof typeof summary]++;
      }
    });

    const details = records.map((r: any) => ({
      date: r.date.toISOString().split('T')[0],
      status: r.status,
      remarks: r.remarks,
    }));

    return {
      teacherId,
      year,
      month,
      summary,
      details,
    };
  }

  // ==========================================
  // ATTENDANCE ANALYTICS
  // ==========================================

  async getAttendanceAnalytics(academyId: string, filters: { batchId?: string }) {
    // Calculates percentage stats
    const whereClause: any = { academyId, deletedAt: null };
    if (filters.batchId) whereClause.batchId = filters.batchId;

    const attendances = await this.prisma.attendance.findMany({
      where: whereClause,
      include: {
        records: true,
      },
      orderBy: { date: 'asc' },
      take: 30, // Last 30 sessions
    });

    const analytics = attendances.map((a: any) => {
      const total = a.records.length;
      const present = a.records.filter((r: any) => r.status === 'present' || r.status === 'late').length;
      const rate = total > 0 ? (present / total) * 100 : 0;

      return {
        date: a.date.toISOString().split('T')[0],
        totalRecords: total,
        presentCount: present,
        attendanceRate: parseFloat(rate.toFixed(2)),
      };
    });

    return analytics;
  }
}
