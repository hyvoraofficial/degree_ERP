import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateBatchDto } from './dto/create-batch.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // COURSE OPERATIONS
  // ==========================================

  async createCourse(academyId: string, dto: CreateCourseDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, academyId, deletedAt: null },
    });
    if (!branch) {
      throw new BadRequestException('The selected Branch is invalid or inactive.');
    }

    const codeExists = await this.prisma.course.findFirst({
      where: { branchId: dto.branchId, code: dto.code, deletedAt: null },
    });
    if (codeExists) {
      throw new BadRequestException(`Course code "${dto.code}" is already defined in this Branch.`);
    }

    const nameExists = await this.prisma.course.findFirst({
      where: { branchId: dto.branchId, name: dto.name, deletedAt: null },
    });
    if (nameExists) {
      throw new BadRequestException(`Course name "${dto.name}" already exists in this Branch.`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const course = await tx.course.create({
        data: {
          academyId,
          name: dto.name,
          code: dto.code,
          description: dto.description,
          syllabusId: dto.syllabusId,
          branchId: dto.branchId,
          duration: dto.duration,
          status: dto.status || 'active',
        },
      });

      if (dto.subjects && dto.subjects.length > 0) {
        for (const sub of dto.subjects) {
          const subNameExists = await tx.subject.findFirst({
            where: { courseId: course.id, name: sub.name, deletedAt: null },
          });
          if (subNameExists) {
            throw new BadRequestException(`Subject "${sub.name}" is already defined in this course.`);
          }
          const subCode = (sub.code || sub.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase() || 'SUB').slice(0, 50);

          await tx.subject.create({
            data: {
              academyId,
              courseId: course.id,
              name: sub.name,
              code: subCode,
              description: sub.description,
              subjectType: sub.subjectType || 'theory',
              status: sub.status || 'active',
            },
          });
        }
      }

      return tx.course.findUnique({
        where: { id: course.id },
        include: { subjects: { where: { deletedAt: null } } },
      });
    });
  }

  private async resolveBranchId(academyId: string, branchId?: string): Promise<string | undefined> {
    if (!branchId) return undefined;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(branchId);
    if (isUuid) return branchId;
    const branch = await this.prisma.branch.findFirst({
      where: {
        academyId,
        deletedAt: null,
        OR: [
          { name: { equals: branchId, mode: 'insensitive' } },
          { code: { equals: branchId, mode: 'insensitive' } },
        ],
      },
    });
    return branch?.id;
  }

  async findAllCourses(
    academyId: string,
    filters: { search?: string; branchId?: string; status?: string; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      academyId,
      deletedAt: null,
    };

    if (filters.branchId) {
      const resolvedId = await this.resolveBranchId(academyId, filters.branchId);
      if (resolvedId) {
        whereClause.branchId = resolvedId;
      }
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where: whereClause,
        include: { branch: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where: whereClause }),
    ]);

    return {
      courses,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOneCourse(academyId: string, id: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        academyId,
        deletedAt: null,
        OR: [
          { id },
          { name: { equals: id, mode: 'insensitive' } },
          { code: { equals: id, mode: 'insensitive' } },
        ],
      },
      include: {
        subjects: { where: { deletedAt: null } },
        branch: true,
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID or name "${id}" not found.`);
    }

    return course;
  }

  async checkSubjectDependencies(academyId: string, subjectId: string) {
    const attendanceCount = await this.prisma.attendance.count({
      where: { academyId, subjectId, deletedAt: null },
    });
    if (attendanceCount > 0) {
      throw new BadRequestException(`Cannot delete subject because attendance logs exist. Archive or deactivate instead.`);
    }

    const materialCount = await this.prisma.studyMaterial.count({
      where: { academyId, subjectId, deletedAt: null },
    });
    if (materialCount > 0) {
      throw new BadRequestException(`Cannot delete subject because study materials exist. Archive or deactivate instead.`);
    }

    const scheduleCount = await this.prisma.classSchedule.count({
      where: { academyId, subjectId, deletedAt: null },
    });
    if (scheduleCount > 0) {
      throw new BadRequestException(`Cannot delete subject because class schedules are active. Archive or deactivate instead.`);
    }

    const teacherSubCount = await this.prisma.teacherSubject.count({
      where: { academyId, subjectId, deletedAt: null },
    });
    if (teacherSubCount > 0) {
      throw new BadRequestException(`Cannot delete subject because teacher assignments exist. Archive or deactivate instead.`);
    }

    const assignmentCount = await this.prisma.assignment.count({
      where: { academyId, subjectId, deletedAt: null },
    });
    if (assignmentCount > 0) {
      throw new BadRequestException(`Cannot delete subject because student assignments exist. Archive or deactivate instead.`);
    }

    const examCount = await this.prisma.examPaper.count({
      where: { academyId, subjectId, deletedAt: null },
    });
    if (examCount > 0) {
      throw new BadRequestException(`Cannot delete subject because exam papers exist. Archive or deactivate instead.`);
    }
  }

  async updateCourse(academyId: string, id: string, dto: Partial<CreateCourseDto>) {
    const course = await this.findOneCourse(academyId, id);

    if (dto.code && dto.code !== course.code) {
      const branchId = dto.branchId || course.branchId;
      const codeExists = await this.prisma.course.findFirst({
        where: { branchId, code: dto.code, deletedAt: null, NOT: { id } },
      });
      if (codeExists) {
        throw new BadRequestException(`Course code "${dto.code}" is already defined in this Branch.`);
      }
    }

    if (dto.name && dto.name !== course.name) {
      const branchId = dto.branchId || course.branchId;
      const nameExists = await this.prisma.course.findFirst({
        where: { branchId, name: dto.name, deletedAt: null, NOT: { id } },
      });
      if (nameExists) {
        throw new BadRequestException(`Course name "${dto.name}" already exists in this Branch.`);
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updatedCourse = await tx.course.update({
        where: { id: course.id },
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          syllabusId: dto.syllabusId,
          branchId: dto.branchId,
          duration: dto.duration,
          status: dto.status,
        },
      });

      if (dto.subjects) {
        for (const sub of dto.subjects) {
          if (sub.id) {
            if (sub.status === 'deleted') {
              await this.checkSubjectDependencies(academyId, sub.id);
              await tx.subject.update({
                where: { id: sub.id },
                data: { deletedAt: new Date() },
              });
            } else {
              if (sub.name) {
                const subNameExists = await tx.subject.findFirst({
                  where: { courseId: id, name: sub.name, deletedAt: null, NOT: { id: sub.id } },
                });
                if (subNameExists) {
                  throw new BadRequestException(`Subject "${sub.name}" already exists in this course.`);
                }
              }

              const subCode = sub.code ? sub.code.toUpperCase() : (sub.name ? sub.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 50) : undefined);

              await tx.subject.update({
                where: { id: sub.id },
                data: {
                  name: sub.name,
                  code: subCode,
                  description: sub.description,
                  subjectType: sub.subjectType || 'theory',
                  status: sub.status || 'active',
                },
              });
            }
          } else {
            const subNameExists = await tx.subject.findFirst({
              where: { courseId: id, name: sub.name, deletedAt: null },
            });
            if (subNameExists) {
              throw new BadRequestException(`Subject "${sub.name}" already exists in this course.`);
            }
            const subCode = (sub.code || sub.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase() || 'SUB').slice(0, 50);

            await tx.subject.create({
              data: {
                academyId,
                courseId: id,
                name: sub.name,
                code: subCode,
                description: sub.description,
                subjectType: sub.subjectType || 'theory',
                status: sub.status || 'active',
              },
            });
          }
        }
      }

      return updatedCourse;
    });
  }

  async removeCourse(academyId: string, id: string, permanent: boolean = false) {
    const course = await this.prisma.course.findFirst({
      where: { id, academyId },
    });
    if (!course) {
      throw new NotFoundException(`Course with ID "${id}" not found.`);
    }

    if (permanent) {
      return this.prisma.$transaction(async (tx: any) => {
        await tx.student.deleteMany({ where: { courseId: id } });
        await tx.batch.deleteMany({ where: { courseId: id } });
        await tx.subject.deleteMany({ where: { courseId: id } });
        await tx.course.delete({ where: { id: course.id } });
        return { id: course.id, deleted: true, permanent: true };
      });
    }

    const studentCount = await this.prisma.student.count({
      where: { courseId: id, deletedAt: null },
    });
    if (studentCount > 0) {
      throw new BadRequestException(`Cannot delete course because ${studentCount} students are enrolled. Archive instead.`);
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx: any) => {
      await tx.course.update({
        where: { id: course.id },
        data: { deletedAt: now },
      });

      await tx.subject.updateMany({
        where: { courseId: course.id, academyId },
        data: { deletedAt: now },
      });

      return { id: course.id, deleted: true };
    });
  }

  // ==========================================
  // SUBJECT OPERATIONS
  // ==========================================

  async createSubject(academyId: string, dto: CreateSubjectDto) {
    const course = await this.findOneCourse(academyId, dto.courseId);

    const nameExists = await this.prisma.subject.findFirst({
      where: { courseId: course.id, name: dto.name, deletedAt: null },
    });
    if (nameExists) {
      throw new BadRequestException(`Subject "${dto.name}" is already defined under this course.`);
    }

    const code = (dto.code || dto.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase() || 'SUB').slice(0, 50);

    return this.prisma.subject.create({
      data: {
        academyId,
        courseId: course.id,
        name: dto.name,
        code,
        description: dto.description,
        subjectType: dto.subjectType || 'theory',
        status: (dto as any).status || 'active',
      },
    });
  }

  async findAllSubjects(academyId: string, courseId?: string, search?: string) {
    const where: any = {
      academyId,
      deletedAt: null,
    };
    if (courseId) {
      where.courseId = courseId;
    }
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    return this.prisma.subject.findMany({
      where,
      include: { course: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOneSubject(academyId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, academyId, deletedAt: null },
      include: { course: true },
    });

    if (!subject) {
      throw new NotFoundException(`Subject with ID "${id}" not found.`);
    }

    return subject;
  }

  async removeSubject(academyId: string, id: string, permanent: boolean = false) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, academyId },
    });
    if (!subject) {
      throw new NotFoundException(`Subject with ID "${id}" not found.`);
    }

    if (permanent) {
      return this.prisma.$transaction(async (tx: any) => {
        await tx.teacherSubject.deleteMany({ where: { subjectId: id } });
        await tx.attendance.deleteMany({ where: { subjectId: id } });
        await tx.studyMaterial.deleteMany({ where: { subjectId: id } });
        await tx.classSchedule.deleteMany({ where: { subjectId: id } });
        await tx.assignment.deleteMany({ where: { subjectId: id } });
        await tx.examPaper.deleteMany({ where: { subjectId: id } });
        await tx.subject.delete({ where: { id: subject.id } });
        return { id: subject.id, deleted: true, permanent: true };
      });
    }

    await this.checkSubjectDependencies(academyId, id);
    return this.prisma.subject.update({
      where: { id: subject.id },
      data: { deletedAt: new Date() },
    });
  }

  async updateSubject(academyId: string, id: string, dto: Partial<CreateSubjectDto> & { status?: string }) {
    const subject = await this.findOneSubject(academyId, id);

    if (dto.name && dto.name !== subject.name) {
      const nameExists = await this.prisma.subject.findFirst({
        where: { courseId: subject.courseId, name: dto.name, deletedAt: null, NOT: { id } },
      });
      if (nameExists) {
        throw new BadRequestException(`Subject "${dto.name}" already exists under this course.`);
      }
    }

    const codeToUpdate = dto.code ? dto.code.toUpperCase() : (dto.name ? dto.name.replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 50) : undefined);

    return this.prisma.subject.update({
      where: { id },
      data: {
        name: dto.name,
        code: codeToUpdate,
        description: dto.description,
        subjectType: dto.subjectType,
        status: dto.status,
      },
    });
  }

  async assignTeacherSubject(
    academyId: string,
    dto: { branchId: string; courseId: string; subjectId: string; batchId?: string; teacherId: string }
  ) {
    const course = await this.prisma.course.findFirst({
      where: {
        academyId,
        deletedAt: null,
        OR: [
          { id: dto.courseId },
          { name: { equals: dto.courseId, mode: 'insensitive' } },
          { code: { equals: dto.courseId, mode: 'insensitive' } },
        ],
      },
    });
    if (!course) throw new BadRequestException('Course is invalid.');

    let branch = null;
    if (dto.branchId) {
      branch = await this.prisma.branch.findFirst({
        where: {
          academyId,
          deletedAt: null,
          OR: [
            { id: dto.branchId },
            { name: { equals: dto.branchId, mode: 'insensitive' } },
            { code: { equals: dto.branchId, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (!branch && course.branchId) {
      branch = await this.prisma.branch.findFirst({
        where: { id: course.branchId, academyId, deletedAt: null },
      });
    }
    if (!branch) {
      branch = await this.prisma.branch.findFirst({
        where: { academyId, deletedAt: null },
      });
    }
    if (!branch) throw new BadRequestException('Branch is invalid.');

    let subject = null;
    if (dto.subjectId) {
      subject = await this.prisma.subject.findFirst({
        where: {
          academyId,
          deletedAt: null,
          OR: [
            { id: dto.subjectId },
            { name: { equals: dto.subjectId, mode: 'insensitive' } },
            { code: { equals: dto.subjectId, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!subject) {
      subject = await this.prisma.subject.findFirst({
        where: { courseId: course.id, academyId, deletedAt: null },
      });
    }

    if (!subject) {
      throw new BadRequestException(`No subjects defined under course "${course.name}". Please add subjects to this course first.`);
    }

    let batch = null;
    if (dto.batchId) {
      batch = await this.prisma.batch.findFirst({
        where: {
          academyId,
          deletedAt: null,
          OR: [
            { id: dto.batchId },
            { name: { equals: dto.batchId, mode: 'insensitive' } },
            { code: { equals: dto.batchId, mode: 'insensitive' } },
          ],
        },
      });
    }
    if (!batch) {
      batch = await this.prisma.batch.findFirst({
        where: { courseId: course.id, academyId, deletedAt: null },
      });
    }
    if (!batch) {
      batch = await this.prisma.batch.findFirst({
        where: { branchId: branch.id, academyId, deletedAt: null },
      });
    }
    if (!batch) {
      batch = await this.prisma.batch.create({
        data: {
          academyId,
          branchId: branch.id,
          courseId: course.id,
          name: `${course.name} - Batch A`,
          code: `${course.code || 'CRS'}-A`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          capacity: 100,
          status: 'active',
        },
      });
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: {
        academyId,
        deletedAt: null,
        OR: [
          { id: dto.teacherId },
          { employeeNumber: dto.teacherId },
          { userId: dto.teacherId },
        ],
      },
    });
    if (!teacher) throw new BadRequestException('Teacher profile is invalid.');

    if (!teacher.branchId && branch.id) {
      await this.prisma.teacher.update({
        where: { id: teacher.id },
        data: { branchId: branch.id },
      });
    }

    return this.prisma.teacherSubject.upsert({
      where: {
        uq_teacher_subject_batch: {
          batchId: batch.id,
          subjectId: subject.id,
          teacherId: teacher.id,
        },
      },
      update: {
        deletedAt: null,
        branchId: branch.id,
        courseId: course.id,
      },
      create: {
        academyId,
        branchId: branch.id,
        courseId: course.id,
        subjectId: subject.id,
        batchId: batch.id,
        teacherId: teacher.id,
      },
    });
  }

  async getTeacherAssignments(academyId: string, filters: { teacherId?: string; subjectId?: string }) {
    const where: any = { academyId, deletedAt: null };
    if (filters.teacherId) where.teacherId = filters.teacherId;
    if (filters.subjectId) where.subjectId = filters.subjectId;

    return this.prisma.teacherSubject.findMany({
      where,
      include: {
        branch: true,
        course: true,
        subject: true,
        batch: true,
        teacher: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeTeacherAssignment(academyId: string, id: string) {
    const assignment = await this.prisma.teacherSubject.findFirst({
      where: { id, academyId, deletedAt: null },
    });
    if (!assignment) throw new NotFoundException('Teacher subject assignment not found.');

    return this.prisma.teacherSubject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ==========================================
  // BATCH OPERATIONS
  // ==========================================

  async createBatch(academyId: string, dto: CreateBatchDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, academyId, deletedAt: null },
    });
    if (!branch) {
      throw new BadRequestException('The selected Branch is invalid or inactive.');
    }

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, academyId, deletedAt: null },
    });
    if (!course) {
      throw new BadRequestException('The selected Course is invalid or inactive.');
    }

    // Uniqueness constraint check: batch code unique within branch
    const codeExists = await this.prisma.batch.findFirst({
      where: { branchId: dto.branchId, code: dto.code, deletedAt: null },
    });
    if (codeExists) {
      throw new BadRequestException(`Batch with code "${dto.code}" already exists in this Branch.`);
    }

    return this.prisma.batch.create({
      data: {
        academyId,
        branchId: dto.branchId,
        courseId: dto.courseId,
        name: dto.name,
        code: dto.code,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        capacity: dto.capacity || 30,
        status: dto.status || 'active',
      },
    });
  }

  async findAllBatches(
    academyId: string,
    filters: { search?: string; branchId?: string; courseId?: string; status?: string; page?: number; limit?: number }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const skip = (page - 1) * limit;

    const whereClause: any = { academyId, deletedAt: null };

    if (filters.branchId) {
      const resolvedId = await this.resolveBranchId(academyId, filters.branchId);
      if (resolvedId) {
        whereClause.branchId = resolvedId;
      }
    }
    if (filters.courseId) {
      whereClause.courseId = filters.courseId;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.batch.findMany({
        where: whereClause,
        include: {
          branch: true,
          course: true,
          _count: {
            select: { students: { where: { deletedAt: null } } },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.batch.count({ where: whereClause }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateBatch(academyId: string, id: string, dto: Partial<CreateBatchDto>) {
    const batch = await this.findOneBatch(academyId, id);

    if (dto.code && dto.code !== batch.code) {
      const branchId = dto.branchId || batch.branchId;
      const codeExists = await this.prisma.batch.findFirst({
        where: { branchId, code: dto.code, deletedAt: null, NOT: { id } },
      });
      if (codeExists) {
        throw new BadRequestException(`Batch with code "${dto.code}" already exists in this Branch.`);
      }
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.code) updateData.code = dto.code;
    if (dto.branchId) updateData.branchId = dto.branchId;
    if (dto.courseId) updateData.courseId = dto.courseId;
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.capacity !== undefined) updateData.capacity = dto.capacity;
    if (dto.status) updateData.status = dto.status;

    return this.prisma.batch.update({
      where: { id },
      data: updateData,
    });
  }

  async removeBatch(academyId: string, id: string) {
    const batch = await this.findOneBatch(academyId, id);

    const studentCount = await this.prisma.student.count({
      where: { batchId: id, deletedAt: null },
    });
    if (studentCount > 0) {
      throw new BadRequestException(`Cannot delete batch because ${studentCount} students are enrolled.`);
    }

    return this.prisma.batch.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findOneBatch(academyId: string, id: string) {
    const batch = await this.prisma.batch.findFirst({
      where: { id, academyId, deletedAt: null },
      include: {
        branch: true,
        course: true,
        students: {
          where: { deletedAt: null },
          include: {
            user: true,
          },
        },
        schedules: {
          where: { deletedAt: null },
          include: {
            subject: true,
            teacher: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID "${id}" not found.`);
    }

    return batch;
  }

  // ==========================================
  // TIMETABLE & CLASS SCHEDULE OPERATIONS
  // ==========================================

  async createSchedule(academyId: string, dto: CreateScheduleDto) {
    // Validate entities presence
    const batch = await this.prisma.batch.findFirst({
      where: { id: dto.batchId, academyId, deletedAt: null },
    });
    if (!batch) {
      throw new BadRequestException('Batch is invalid or deactivated.');
    }

    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, academyId, deletedAt: null },
    });
    if (!subject) {
      throw new BadRequestException('Subject is invalid or deactivated.');
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: { id: dto.teacherId, academyId, deletedAt: null },
    });
    if (!teacher) {
      throw new BadRequestException('Teacher profile is invalid or deactivated.');
    }

    // Check teacher collision on same day/time slot
    const collision = await this.prisma.classSchedule.findFirst({
      where: {
        academyId,
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        deletedAt: null,
      },
    });

    if (collision) {
      throw new BadRequestException(`Teacher is already scheduled to teach in another classroom at this day/time.`);
    }

    return this.prisma.classSchedule.create({
      data: {
        academyId,
        batchId: dto.batchId,
        subjectId: dto.subjectId,
        teacherId: dto.teacherId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        room: dto.room,
      },
    });
  }

  async findSchedules(academyId: string, filters: { batchId?: string; teacherId?: string }) {
    const whereClause: any = { academyId, deletedAt: null };
    if (filters.batchId) whereClause.batchId = filters.batchId;
    if (filters.teacherId) whereClause.teacherId = filters.teacherId;

    return this.prisma.classSchedule.findMany({
      where: whereClause,
      include: {
        batch: true,
        subject: true,
        teacher: { include: { user: true } },
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  async removeSchedule(academyId: string, id: string) {
    const schedule = await this.prisma.classSchedule.findFirst({
      where: { id, academyId, deletedAt: null },
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID "${id}" not found.`);
    }

    return this.prisma.classSchedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
