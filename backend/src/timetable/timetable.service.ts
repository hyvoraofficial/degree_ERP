import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimetableDto } from './dto/create-timetable.dto';

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async findByBatch(academyId: string, batchId: string) {
    return this.prisma.timetableSchedule.findMany({
      where: {
        academyId,
        batchId,
        deletedAt: null,
      },
      include: {
        subject: { select: { id: true, name: true, code: true, subjectType: true, credits: true } },
        teacher: {
          select: {
            id: true,
            employeeNumber: true,
            designation: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findByTeacher(academyId: string, teacherId: string) {
    return this.prisma.timetableSchedule.findMany({
      where: {
        academyId,
        teacherId,
        deletedAt: null,
      },
      include: {
        course: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, sectionName: true, currentSemester: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async create(academyId: string, dto: CreateTimetableDto) {
    return this.prisma.timetableSchedule.create({
      data: {
        academyId,
        branchId: dto.branchId,
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        batchId: dto.batchId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        roomNumber: dto.roomNumber,
        isLab: dto.isLab || false,
        status: 'active',
      },
      include: {
        subject: true,
        teacher: { include: { user: true } },
      },
    });
  }

  async remove(academyId: string, id: string) {
    const item = await this.prisma.timetableSchedule.findFirst({
      where: { id, academyId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Timetable schedule entry not found.');

    return this.prisma.timetableSchedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
