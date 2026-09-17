import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // HELPER CACHE CHECKER
  // ==========================================

  private async getCachedMetric(academyId: string, key: string, dimension = 'overall', dimensionId: string | null = null) {
    const cached = await this.prisma.dashboardCache.findFirst({
      where: {
        academyId,
        metricKey: key,
        dimension,
        dimensionId: dimensionId || null,
        cachedUntil: { gte: new Date() },
        deletedAt: null,
      },
    });
    return cached ? { value: parseFloat(cached.metricValue.toString()), rawData: cached.rawData } : null;
  }

  private async setCachedMetric(
    academyId: string,
    key: string,
    value: number,
    rawData: any = {},
    dimension = 'overall',
    dimensionId: string | null = null
  ) {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // Cache for 1 hour

    await this.prisma.dashboardCache.upsert({
      where: {
        uq_academy_metric_dimension: {
          academyId,
          metricKey: key,
          dimension,
          dimensionId: dimensionId || '00000000-0000-0000-0000-000000000000', // Unique mapping fallback
        },
      },
      update: {
        metricValue: new Prisma.Decimal(value.toString()),
        rawData,
        cachedUntil: expiry,
        deletedAt: null,
      },
      create: {
        academyId,
        metricKey: key,
        metricValue: new Prisma.Decimal(value.toString()),
        dimension,
        dimensionId: dimensionId || '00000000-0000-0000-0000-000000000000',
        rawData,
        cachedUntil: expiry,
      },
    });
  }

  // ==========================================
  // DASHBOARD STATISTICS (OPTIMIZED METRICS)
  // ==========================================

  async getDashboardStats(academyId: string, query: AnalyticsQueryDto) {
    const refresh = query.refreshCache || false;
    const cacheKey = 'dashboard_stats';

    if (!refresh) {
      const cached = await this.getCachedMetric(academyId, cacheKey);
      if (cached) return cached.rawData;
    }

    // Run optimized database counts & aggregation queries
    const [
      studentsCount,
      teachersCount,
      batchesCount,
      revenueResult,
      attendanceRateResult,
    ] = await Promise.all([
      this.prisma.student.count({ where: { academyId, deletedAt: null } }),
      this.prisma.teacher.count({ where: { academyId, deletedAt: null } }),
      this.prisma.batch.count({ where: { academyId, status: 'active', deletedAt: null } }),
      // Optimized query: Sum of paid fees transactions
      this.prisma.payment.aggregate({
        where: { academyId, deletedAt: null },
        _sum: { amountPaid: true },
      }),
      // Attendance rates percentages
      this.prisma.attendanceRecord.aggregate({
        where: { attendance: { academyId } },
        _count: { id: true },
      }),
    ]);

    // Average attendance percentage
    const presentRecords = await this.prisma.attendanceRecord.count({
      where: { attendance: { academyId }, status: 'present' },
    });
    const totalRecordsCount = attendanceRateResult._count.id;
    const avgAttendanceRate = totalRecordsCount > 0 ? (presentRecords / totalRecordsCount) * 100 : 100.0;

    const revenue = revenueResult._sum?.amountPaid ? parseFloat(revenueResult._sum.amountPaid.toString()) : 0;

    const statsPayload = {
      overall: {
        totalStudents: studentsCount,
        totalTeachers: teachersCount,
        activeBatches: batchesCount,
        totalRevenue: revenue,
        averageAttendanceRate: parseFloat(avgAttendanceRate.toFixed(2)),
      },
    };

    await this.setCachedMetric(academyId, cacheKey, revenue, statsPayload);

    return statsPayload;
  }

  // ==========================================
  // STUDENT ANALYTICS TRENDS
  // ==========================================

  async getStudentAnalytics(academyId: string) {
    // 1. Gender breakdown using Prisma GroupBy
    const genderGroups = await this.prisma.student.groupBy({
      by: ['gender'],
      where: { academyId, deletedAt: null },
      _count: { id: true },
    });

    const genderDistribution = genderGroups.map((g) => ({
      name: g.gender ? g.gender.charAt(0).toUpperCase() + g.gender.slice(1) : 'Other',
      count: g._count.id,
    }));

    // 2. Department distribution
    const departmentGroups = await this.prisma.student.groupBy({
      by: ['departmentId'],
      where: { academyId, deletedAt: null },
      _count: { id: true },
    });

    const departments = await this.prisma.department.findMany({
      where: { academyId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
    const deptMap = new Map(departments.map(d => [d.id, d.code || d.name]));

    const departmentDistribution = departmentGroups.map(dg => ({
      name: dg.departmentId ? deptMap.get(dg.departmentId) || 'General' : 'General',
      count: dg._count.id,
    }));

    // 3. Admission trends by month
    const students = await this.prisma.student.findMany({
      where: { academyId, deletedAt: null },
      select: { createdAt: true },
    });

    const monthCounts: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    students.forEach(st => {
      const m = months[new Date(st.createdAt).getMonth()];
      monthCounts[m] = (monthCounts[m] || 0) + 1;
    });

    const admissionGrowthTrend = months
      .filter(m => monthCounts[m] !== undefined || ['Aug', 'Sep', 'Oct'].includes(m))
      .map(month => ({
        month,
        admissions: monthCounts[month] || 0,
      }));

    return {
      genderDistribution: genderDistribution.length > 0 ? genderDistribution : [{ name: 'Enrolled', count: students.length }],
      departmentDistribution,
      admissionGrowthTrend: admissionGrowthTrend.length > 0 ? admissionGrowthTrend : [{ month: 'Current', admissions: students.length }],
    };
  }

  // ==========================================
  // TEACHER ANALYTICS DISTRIBUTION
  // ==========================================

  async getTeacherAnalytics(academyId: string) {
    const totalTeachers = await this.prisma.teacher.count({
      where: { academyId, deletedAt: null },
    });

    const pendingLeavesCount = await this.prisma.teacherLeave.count({
      where: { academyId, status: 'pending', deletedAt: null },
    });

    const departmentFaculty = await this.prisma.teacher.groupBy({
      by: ['departmentId'],
      where: { academyId, deletedAt: null },
      _count: { id: true },
    });

    const departments = await this.prisma.department.findMany({
      where: { academyId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
    const deptMap = new Map(departments.map(d => [d.id, d.code || d.name]));

    const facultyDistribution = departmentFaculty.map(df => ({
      department: df.departmentId ? deptMap.get(df.departmentId) || 'General' : 'General',
      count: df._count.id,
    }));

    return {
      totalTeachersCount: totalTeachers,
      pendingLeaveRequests: pendingLeavesCount,
      facultyDistribution,
    };
  }

  // ==========================================
  // REVENUE ANALYTICS AGGREGATES
  // ==========================================

  async getRevenueAnalytics(academyId: string) {
    const paymentModes = await this.prisma.payment.groupBy({
      by: ['paymentMode'],
      where: { academyId, deletedAt: null },
      _sum: { amountPaid: true },
    });

    const collectionsSummary = paymentModes.map((m) => ({
      method: m.paymentMode || 'Online',
      totalAmount: m._sum?.amountPaid ? parseFloat(m._sum.amountPaid.toString()) : 0,
    }));

    const payments = await this.prisma.payment.findMany({
      where: { academyId, deletedAt: null },
      select: { paymentDate: true, amountPaid: true },
    });

    const monthSums: Record<string, number> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    payments.forEach(p => {
      const m = months[new Date(p.paymentDate).getMonth()];
      monthSums[m] = (monthSums[m] || 0) + parseFloat(p.amountPaid.toString());
    });

    const monthlyRevenueTrend = Object.keys(monthSums).map(month => ({
      month,
      collections: monthSums[month],
    }));

    return {
      collectionsSummary: collectionsSummary.length > 0 ? collectionsSummary : [{ method: 'Total', totalAmount: 0 }],
      monthlyRevenueTrend: monthlyRevenueTrend.length > 0 ? monthlyRevenueTrend : [{ month: 'Current', collections: 0 }],
    };
  }

  // ==========================================
  // ATTENDANCE ANALYTICS RANKS
  // ==========================================

  async getAttendanceAnalytics(academyId: string) {
    // 1. Get recent attendance sessions
    const sessions = await this.prisma.attendance.findMany({
      where: { academyId, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 7,
      select: {
        date: true,
        totalStudents: true,
        presentCount: true,
      },
    });

    const attendanceTrends = sessions.map(s => {
      const total = s.totalStudents || 0;
      const present = s.presentCount || 0;
      const pct = total > 0 ? (present / total) * 100 : 100.0;
      return {
        date: new Date(s.date).toISOString().split('T')[0],
        presencePercentage: parseFloat(pct.toFixed(1)),
      };
    });

    // 2. Batch rankings by attendance
    const batches = await this.prisma.batch.findMany({
      where: { academyId, deletedAt: null },
      include: {
        attendance: {
          where: { deletedAt: null },
          select: { totalStudents: true, presentCount: true },
        },
      },
    });

    const batchRankings = batches.map((b, idx) => {
      let totalStudents = 0;
      let totalPresent = 0;
      b.attendance.forEach((s: any) => {
        totalStudents += s.totalStudents || 0;
        totalPresent += s.presentCount || 0;
      });
      const attendanceRate = totalStudents > 0 ? (totalPresent / totalStudents) * 100 : 100.0;
      return {
        rank: idx + 1,
        batchName: b.name,
        attendanceRate: parseFloat(attendanceRate.toFixed(1)),
      };
    }).sort((a, b) => b.attendanceRate - a.attendanceRate).map((item, idx) => ({ ...item, rank: idx + 1 }));

    return {
      attendanceTrends: attendanceTrends.length > 0 ? attendanceTrends : [{ date: new Date().toISOString().split('T')[0], presencePercentage: 100.0 }],
      batchRankings,
    };
  }
}
