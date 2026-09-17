import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(academyId: string, branchId?: string, search?: string) {
    const where: any = {
      academyId,
      deletedAt: null,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const departments = await this.prisma.department.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        hod: {
          select: {
            id: true,
            employeeNumber: true,
            designation: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        _count: {
          select: {
            courses: true,
            subjects: true,
            teachers: true,
            students: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      branchId: d.branchId,
      branch: d.branch,
      hodId: d.hodId,
      hod: d.hod
        ? {
            id: d.hod.id,
            name: `${d.hod.user.firstName} ${d.hod.user.lastName || ''}`.trim(),
            employeeNumber: d.hod.employeeNumber,
            designation: d.hod.designation,
          }
        : null,
      status: d.status,
      stats: {
        programsCount: d._count.courses,
        subjectsCount: d._count.subjects,
        facultyCount: d._count.teachers,
        studentsCount: d._count.students,
      },
      createdAt: d.createdAt,
    }));
  }

  async findOne(academyId: string, id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, academyId, deletedAt: null },
      include: {
        branch: true,
        hod: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        courses: {
          where: { deletedAt: null },
          select: { id: true, name: true, code: true, degreeType: true, totalSemesters: true },
        },
        teachers: {
          where: { deletedAt: null },
          select: {
            id: true,
            employeeNumber: true,
            designation: true,
            qualification: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department record not found.');
    }

    return department;
  }

  async create(academyId: string, dto: CreateDepartmentDto) {
    const existing = await this.prisma.department.findFirst({
      where: {
        academyId,
        code: dto.code,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Department with code "${dto.code}" already exists.`);
    }

    return this.prisma.department.create({
      data: {
        academyId,
        branchId: dto.branchId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        hodId: dto.hodId,
        status: 'active',
      },
    });
  }

  async update(academyId: string, id: string, dto: Partial<UpdateDepartmentDto>) {
    await this.findOne(academyId, id);

    return this.prisma.department.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        branchId: dto.branchId,
        hodId: dto.hodId,
      },
    });
  }

  async remove(academyId: string, id: string) {
    await this.findOne(academyId, id);

    return this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
