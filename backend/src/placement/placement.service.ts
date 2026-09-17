import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlacementDriveDto, ApplyPlacementDto } from './dto/create-placement.dto';

@Injectable()
export class PlacementService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllDrives(academyId: string) {
    return this.prisma.placementDrive.findMany({
      where: { academyId, deletedAt: null },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDriveDetails(academyId: string, id: string) {
    const drive = await this.prisma.placementDrive.findFirst({
      where: { id, academyId, deletedAt: null },
      include: {
        applications: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true, email: true, phone: true } },
                course: { select: { name: true, code: true } },
              },
            },
          },
          orderBy: { appliedAt: 'desc' },
        },
      },
    });

    if (!drive) throw new NotFoundException('Placement drive not found.');
    return drive;
  }

  async createDrive(academyId: string, dto: CreatePlacementDriveDto) {
    return this.prisma.placementDrive.create({
      data: {
        academyId,
        companyName: dto.companyName,
        jobRole: dto.jobRole,
        packageLpa: dto.packageLpa,
        eligibilityCriteria: dto.eligibilityCriteria,
        driveDate: dto.driveDate ? new Date(dto.driveDate) : null,
        deadlineDate: dto.deadlineDate ? new Date(dto.deadlineDate) : null,
        location: dto.location || 'Campus / Bangalore',
        status: 'open',
      },
    });
  }

  async applyToDrive(academyId: string, driveId: string, dto: ApplyPlacementDto) {
    const drive = await this.prisma.placementDrive.findFirst({
      where: { id: driveId, academyId, deletedAt: null },
    });
    if (!drive) throw new NotFoundException('Placement drive not found.');

    const existing = await this.prisma.studentPlacement.findUnique({
      where: {
        uq_student_placement: { driveId, studentId: dto.studentId },
      },
    });
    if (existing) throw new ConflictException('Student has already applied for this campus drive.');

    return this.prisma.studentPlacement.create({
      data: {
        academyId,
        driveId,
        studentId: dto.studentId,
        remarks: dto.remarks,
        status: 'applied',
      },
    });
  }

  async updateApplicationStatus(academyId: string, applicationItemId: string, status: string, remarks?: string) {
    return this.prisma.studentPlacement.update({
      where: { id: applicationItemId },
      data: { status, remarks },
    });
  }
}
