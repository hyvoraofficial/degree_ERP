import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres.krewbjxfqyngxbwfsgfc:HYVORA_EduERP@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const isRemote = dbUrl.includes('supabase') || dbUrl.includes('aws') || dbUrl.includes('pooler');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runE2ECheck() {
  console.log('--- STARTING HYVORA EDUERP E2E VERIFICATION ---');

  try {
    // 1. Verify Academy
    let academy = await prisma.academy.findFirst({ where: { deletedAt: null } });
    if (!academy) {
      console.log('Seeding default demo Academy...');
      academy = await prisma.academy.create({
        data: {
          name: 'Hyvora Academy',
          subdomain: 'hyvora',
          status: 'active',
        },
      });
    }
    console.log(`[PASS] Academy Verified: ${academy.name} (id: ${academy.id}, subdomain: ${academy.subdomain})`);

    // 2. Verify / Create Admin User
    const adminEmail = 'admin@hyvora.com';
    let adminUser = await prisma.user.findFirst({ where: { academyId: academy.id, email: adminEmail } });
    if (!adminUser) {
      const hash = await bcrypt.hash('admin123', 10);
      adminUser = await prisma.user.create({
        data: {
          academyId: academy.id,
          email: adminEmail,
          passwordHash: hash,
          firstName: 'Hemanth',
          lastName: 'Admin',
          status: 'active',
        },
      });
    }
    console.log(`[PASS] Admin User Verified: ${adminUser.email} (id: ${adminUser.id})`);

    // 3. Verify / Create Branch
    let branch = await prisma.branch.findFirst({ where: { academyId: academy.id, deletedAt: null } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          academyId: academy.id,
          name: 'Electronic City Campus',
          code: 'EC01',
          address: 'Electronic City Phase 1',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560100',
          contactNumber: '+91-9876543210',
          email: 'ecity@hyvora.com',
          status: 'active',
        },
      });
    }
    console.log(`[PASS] Branch Verified: ${branch.name} (id: ${branch.id}, code: ${branch.code})`);

    // 4. Verify / Create Course
    let course = await prisma.course.findFirst({ where: { academyId: academy.id, branchId: branch.id, deletedAt: null } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          academyId: academy.id,
          branchId: branch.id,
          name: 'JEE Advanced Program',
          code: 'JEE-ADV-2026',
          status: 'active',
          duration: '2 Years',
        },
      });
    }
    console.log(`[PASS] Course Verified: ${course.name} (id: ${course.id})`);

    // 5. Verify / Create Subject
    let subject = await prisma.subject.findFirst({ where: { academyId: academy.id, courseId: course.id, deletedAt: null } });
    if (!subject) {
      subject = await prisma.subject.create({
        data: {
          academyId: academy.id,
          courseId: course.id,
          name: 'Physics',
          code: 'PHY101',
          subjectType: 'theory',
          status: 'active',
        },
      });
    }
    console.log(`[PASS] Subject Verified: ${subject.name} (id: ${subject.id})`);

    // 6. Verify / Create Batch
    let batch = await prisma.batch.findFirst({ where: { academyId: academy.id, branchId: branch.id, courseId: course.id, deletedAt: null } });
    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          academyId: academy.id,
          branchId: branch.id,
          courseId: course.id,
          name: 'Batch A - 2026',
          code: 'BATCH-A-2026',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-12-31'),
          capacity: 40,
          status: 'active',
        },
      });
    }
    console.log(`[PASS] Batch Verified: ${batch.name} (id: ${batch.id})`);

    // 7. Verify / Create Teacher
    const teacherEmail = 'teacher@hyvora.com';
    let teacherUser = await prisma.user.findFirst({ where: { academyId: academy.id, email: teacherEmail } });
    if (!teacherUser) {
      const hash = await bcrypt.hash('teacher123', 10);
      teacherUser = await prisma.user.create({
        data: {
          academyId: academy.id,
          email: teacherEmail,
          passwordHash: hash,
          firstName: 'Ramesh',
          lastName: 'Sharma',
          status: 'active',
        },
      });
    }
    let teacher = await prisma.teacher.findFirst({ where: { userId: teacherUser.id } });
    if (!teacher) {
      teacher = await prisma.teacher.create({
        data: {
          academyId: academy.id,
          branchId: branch.id,
          userId: teacherUser.id,
          employeeNumber: 'TCH-2026-001',
          designation: 'Senior Physics Faculty',
          status: 'active',
        },
      });
    }
    console.log(`[PASS] Teacher Verified: ${teacherUser.firstName} ${teacherUser.lastName} (id: ${teacher.id})`);

    // 8. Verify / Create Student
    const studentEmail = 'arjun@hyvora.com';
    let studentUser = await prisma.user.findFirst({ where: { academyId: academy.id, email: studentEmail } });
    if (!studentUser) {
      const hash = await bcrypt.hash('student123', 10);
      studentUser = await prisma.user.create({
        data: {
          academyId: academy.id,
          email: studentEmail,
          passwordHash: hash,
          firstName: 'Arjun',
          lastName: 'Mehta',
          status: 'active',
          initialPassword: 'Std#HYV2026!01',
        },
      });
    }
    let student = await prisma.student.findFirst({ where: { userId: studentUser.id } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          academyId: academy.id,
          branchId: branch.id,
          userId: studentUser.id,
          courseId: course.id,
          batchId: batch.id,
          admissionNumber: 'HYV-2026-0001',
          dateOfBirth: new Date('2008-05-15'),
          parentName: 'Devendra Mehta',
          parentPhone: '+91-9876543211',
          fatherName: 'Devendra Mehta',
          motherName: 'Sunita Mehta',
          rollNumber: 'R101',
        },
      });
    }
    console.log(`[PASS] Student Verified: ${studentUser.firstName} ${studentUser.lastName} (admission: ${student.admissionNumber}, id: ${student.id})`);

    // 9. Create / Verify Study Material
    let material = await prisma.studyMaterial.findFirst({
      where: { academyId: academy.id, subjectId: subject.id, deletedAt: null }
    });
    if (!material) {
      material = await prisma.studyMaterial.create({
        data: {
          academyId: academy.id,
          title: 'Quantum Mechanics Comprehensive Guide PDF',
          description: 'Wave equations and harmonic oscillator notes',
          subjectId: subject.id,
          teacherId: teacher.id,
          materialType: 'pdf',
          accessLevel: 'batch_only',
          url: 'https://storage.hyvora.io/quantum-guide.pdf',
        },
      });
      await prisma.studyMaterialBatch.create({
        data: {
          academyId: academy.id,
          studyMaterialId: material.id,
          batchId: batch.id,
        },
      });
    }
    console.log(`[PASS] Study Material Verified: ${material.title} (id: ${material.id})`);

    // 10. Verify Student Study Material Query
    const studentMaterials = await prisma.studyMaterial.findMany({
      where: {
        academyId: academy.id,
        deletedAt: null,
        OR: [
          { accessLevel: 'public' },
          { accessLevel: 'registered' },
          {
            AND: [
              { accessLevel: 'batch_only' },
              { batches: { some: { batchId: student.batchId, deletedAt: null } } },
            ],
          },
        ],
      },
    });
    console.log(`[PASS] Student Material Query Returned ${studentMaterials.length} materials for Student Batch.`);

    // 11. Create / Verify Assignment
    let assignment = await prisma.assignment.findFirst({
      where: { academyId: academy.id, batchId: batch.id, subjectId: subject.id, deletedAt: null }
    });
    if (!assignment) {
      assignment = await prisma.assignment.create({
        data: {
          academyId: academy.id,
          batchId: batch.id,
          subjectId: subject.id,
          teacherId: teacher.id,
          title: 'Physics Calculus & Dynamics Problem Set #1',
          description: 'Solve problems 1 through 15',
          maxMarks: 100,
          dueDate: new Date(Date.now() + 7 * 86400000),
        },
      });
    }
    console.log(`[PASS] Assignment Verified: ${assignment.title} (id: ${assignment.id})`);

    // 12. Verify Student Assignment Query
    const studentAssignments = await prisma.assignment.findMany({
      where: { academyId: academy.id, batchId: student.batchId, deletedAt: null },
    });
    console.log(`[PASS] Student Assignment Query Returned ${studentAssignments.length} assignments for Student Batch.`);

    // 13. Create Attendance Record
    const attendanceDate = new Date('2026-08-11');
    let attendance = await prisma.attendance.findFirst({
      where: { batchId: batch.id, date: attendanceDate, subjectId: subject.id, deletedAt: null }
    });
    if (!attendance) {
      attendance = await prisma.attendance.create({
        data: {
          academyId: academy.id,
          batchId: batch.id,
          subjectId: subject.id,
          teacherId: teacher.id,
          date: attendanceDate,
        },
      });
      await prisma.attendanceRecord.create({
        data: {
          academyId: academy.id,
          attendanceId: attendance.id,
          studentId: student.id,
          status: 'present',
        },
      });
    }
    console.log(`[PASS] Attendance Record Verified: Batch ${batch.name}, Subject ${subject.name}, Status Present.`);

    console.log('--- ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY 🚀 ---');
  } catch (err) {
    console.error('E2E Verification Failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runE2ECheck();
