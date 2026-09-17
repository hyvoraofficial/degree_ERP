import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const isRemote = dbUrl?.includes('supabase') || dbUrl?.includes('aws') || dbUrl?.includes('pooler');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting HYVORA EduERP Degree College Database Seeding...');

  // Ensure table columns and constraints exist
  await pool.query(`
    ALTER TABLE IF EXISTS branches ADD COLUMN IF NOT EXISTS pincode VARCHAR(20) DEFAULT '560001';
    ALTER TABLE IF EXISTS branches ADD COLUMN IF NOT EXISTS contact_number VARCHAR(50);
    ALTER TABLE IF EXISTS branches ADD COLUMN IF NOT EXISTS manager_id UUID;
    ALTER TABLE IF EXISTS attendance ADD COLUMN IF NOT EXISTS branch_id UUID;
    ALTER TABLE IF EXISTS attendance ADD COLUMN IF NOT EXISTS total_students INT DEFAULT 0;
    ALTER TABLE IF EXISTS attendance ADD COLUMN IF NOT EXISTS present_count INT DEFAULT 0;
    ALTER TABLE IF EXISTS attendance ADD COLUMN IF NOT EXISTS absent_count INT DEFAULT 0;
    ALTER TABLE IF EXISTS teacher_subjects ADD COLUMN IF NOT EXISTS branch_id UUID;
    ALTER TABLE IF EXISTS teacher_subjects ADD COLUMN IF NOT EXISTS course_id UUID;
    ALTER TABLE IF EXISTS teacher_subjects ADD COLUMN IF NOT EXISTS batch_id UUID;
    ALTER TABLE IF EXISTS subjects DROP CONSTRAINT IF EXISTS subjects_subject_type_check;
    ALTER TABLE IF EXISTS subjects ADD CONSTRAINT subjects_subject_type_check CHECK (subject_type IN ('theory', 'lab', 'practical', 'elective', 'project', 'seminar'));
    ALTER TABLE IF EXISTS students DROP CONSTRAINT IF EXISTS students_gender_check;
    ALTER TABLE IF EXISTS students ADD CONSTRAINT students_gender_check CHECK (LOWER(gender) IN ('male', 'female', 'other', 'prefer_not_to_say'));
    CREATE TABLE IF NOT EXISTS login_activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      attempted_email VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      ip_address VARCHAR(45),
      user_agent VARCHAR(512),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
  `);

  const academyId = 'a1111111-1111-1111-1111-111111111111';
  const roleSuperAdminId = 'e1111111-1111-1111-1111-111111111111';
  const roleAdminId = 'e2222222-2222-2222-2222-222222222222';
  const roleFacultyId = 'e3333333-3333-3333-3333-333333333333';
  const roleStudentId = 'e4444444-4444-4444-4444-444444444444';

  // Cleanup previous demo records for clean idempotency
  try {
    await prisma.studentPlacement.deleteMany({ where: { academyId } });
    await prisma.internshipRecord.deleteMany({ where: { academyId } });
    await prisma.bookIssueRecord.deleteMany({ where: { academyId } });
    await prisma.payment.deleteMany({ where: { feeAllocation: { academyId } } });
    await prisma.feeAllocation.deleteMany({ where: { academyId } });
    await prisma.examResult.deleteMany({ where: { examPaper: { academyId } } });
    await prisma.examPaper.deleteMany({ where: { academyId } });
    await prisma.exam.deleteMany({ where: { academyId } });
    await prisma.attendanceRecord.deleteMany({ where: { attendance: { academyId } } });
    await prisma.attendance.deleteMany({ where: { academyId } });
    await prisma.timetableSchedule.deleteMany({ where: { academyId } });
    await prisma.teacherSubject.deleteMany({ where: { teacher: { academyId } } });
    await prisma.studentSemesterGrade.deleteMany({ where: { academyId } });
    await prisma.student.deleteMany({ where: { academyId } });
    await prisma.department.updateMany({ where: { academyId }, data: { hodId: null } });
    await prisma.teacher.deleteMany({ where: { academyId } });
    await prisma.userRole.deleteMany({ where: { user: { academyId } } });
    await prisma.user.deleteMany({ where: { academyId } });
  } catch (cleanErr) {
    console.warn('Initial cleanup note:', cleanErr);
  }

  // =========================================================================
  // 1. INSTITUTION SETUP (Hyvora Institute of Technology & Management)
  // =========================================================================
  console.log('1. Seeding Institution...');
  await prisma.academy.upsert({
    where: { id: academyId },
    update: {
      name: 'Hyvora Institute of Technology & Management',
      subdomain: 'hyvora',
      domain: 'hitm.edu.in',
      status: 'active',
    },
    create: {
      id: academyId,
      name: 'Hyvora Institute of Technology & Management',
      subdomain: 'hyvora',
      domain: 'hitm.edu.in',
      status: 'active',
    },
  });

  // Institution Settings & Academic Years
  await prisma.academySetting.upsert({
    where: { academyId },
    update: {
      primaryColor: '#3b82f6',
      secondaryColor: '#0ea5e9',
      address: 'Campus Boulevard, Electronic City Phase 1, Bangalore, Karnataka 560100',
      phone: '+91-80-28520000',
      email: 'admissions@hitm.edu.in',
      academicYear: '2026-27',
      currentSemester: 'Odd Semester (Sem 1, 3, 5, 7)',
      institutionType: 'Engineering & Degree College',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      theme: 'light',
    },
    create: {
      id: 'a2222222-2222-2222-2222-222222222222',
      academyId,
      primaryColor: '#3b82f6',
      secondaryColor: '#0ea5e9',
      address: 'Campus Boulevard, Electronic City Phase 1, Bangalore, Karnataka 560100',
      phone: '+91-80-28520000',
      email: 'admissions@hitm.edu.in',
      academicYear: '2026-27',
      currentSemester: 'Odd Semester (Sem 1, 3, 5, 7)',
      institutionType: 'Engineering & Degree College',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      theme: 'light',
    },
  });

  // System Roles
  const roles = [
    { id: roleSuperAdminId, name: 'Super Admin', code: 'SUPER_ADMIN', description: 'Global System Administrator', isSystem: true, academyId: null },
    { id: roleAdminId, name: 'College Admin', code: 'ACADEMY_ADMIN', description: 'Institutional Dean & Administrator', isSystem: true, academyId },
    { id: roleFacultyId, name: 'Faculty', code: 'TEACHER', description: 'Professor / Assistant Professor / Academic Staff', isSystem: true, academyId },
    { id: roleStudentId, name: 'Student', code: 'STUDENT', description: 'Enrolled Degree Candidate', isSystem: true, academyId },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: { name: r.name, description: r.description },
      create: r,
    });
  }

  // =========================================================================
  // 2. CAMPUSES / BRANCHES
  // =========================================================================
  console.log('2. Seeding Campuses...');
  const mainCampusId = 'b1111111-1111-1111-1111-111111111111';
  const ecCampusId = 'b2222222-2222-2222-2222-222222222222';

  await prisma.branch.upsert({
    where: { id: mainCampusId },
    update: {
      name: 'Main Campus',
      code: 'MAIN-CAMPUS',
      address: 'University Road, Knowledge City, Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      contactNumber: '+91-80-28520001',
      email: 'main-campus@hitm.edu.in',
      status: 'active',
    },
    create: {
      id: mainCampusId,
      academyId,
      name: 'Main Campus',
      code: 'MAIN-CAMPUS',
      address: 'University Road, Knowledge City, Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      contactNumber: '+91-80-28520001',
      email: 'main-campus@hitm.edu.in',
      status: 'active',
    },
  });

  await prisma.branch.upsert({
    where: { id: ecCampusId },
    update: {
      name: 'Electronic City Campus',
      code: 'EC-CAMPUS',
      address: 'Electronic City Phase 1, Hosur Main Road, Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560100',
      contactNumber: '+91-80-28520002',
      email: 'ec-campus@hitm.edu.in',
      status: 'active',
    },
    create: {
      id: ecCampusId,
      academyId,
      name: 'Electronic City Campus',
      code: 'EC-CAMPUS',
      address: 'Electronic City Phase 1, Hosur Main Road, Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560100',
      contactNumber: '+91-80-28520002',
      email: 'ec-campus@hitm.edu.in',
      status: 'active',
    },
  });

  // Admin Account (admin / admin)
  const adminPassword = await bcrypt.hash('admin', 10);
  const adminUserId = '11111111-1111-1111-1111-111111111111';

  await prisma.user.upsert({
    where: { id: adminUserId },
    update: {
      email: 'admin@hyvora.com',
      passwordHash: adminPassword,
      initialPassword: 'admin',
      firstName: 'Dr. Rajesh',
      lastName: 'Venkatesh',
      phone: '+91-9876543210',
      status: 'active',
      isEmailVerified: true,
      isDefaultPassword: false,
    },
    create: {
      id: adminUserId,
      academyId,
      email: 'admin@hyvora.com',
      passwordHash: adminPassword,
      initialPassword: 'admin',
      firstName: 'Dr. Rajesh',
      lastName: 'Venkatesh',
      phone: '+91-9876543210',
      status: 'active',
      isEmailVerified: true,
      isDefaultPassword: false,
    },
  });

  await prisma.userRole.upsert({
    where: { uq_user_role: { userId: adminUserId, roleId: roleAdminId } },
    update: {},
    create: { academyId, userId: adminUserId, roleId: roleAdminId },
  });

  // =========================================================================
  // 3. DEPARTMENTS
  // =========================================================================
  console.log('3. Seeding Departments...');
  const cseDeptId = 'd1111111-1111-1111-1111-111111111111';
  const iseDeptId = 'd2222222-2222-2222-2222-222222222222';
  const eceDeptId = 'd3333333-3333-3333-3333-333333333333';
  const aimlDeptId = 'd4444444-4444-4444-4444-444444444444';
  const bbaDeptId = 'd5555555-5555-5555-5555-555555555555';
  const bcaDeptId = 'd6666666-6666-6666-6666-666666666666';

  const departmentsData = [
    { id: cseDeptId, name: 'Computer Science & Engineering', code: 'CSE', description: 'Department of Computer Science & Software Engineering', branchId: mainCampusId },
    { id: iseDeptId, name: 'Information Science & Engineering', code: 'ISE', description: 'Department of Information Systems & Computing', branchId: mainCampusId },
    { id: eceDeptId, name: 'Electronics & Communication Engineering', code: 'ECE', description: 'Department of Signal Processing, VLSI & Embedded Systems', branchId: mainCampusId },
    { id: aimlDeptId, name: 'Artificial Intelligence & Machine Learning', code: 'AIML', description: 'Department of AI, Data Intelligence & Neural Networks', branchId: mainCampusId },
    { id: bbaDeptId, name: 'Business Administration', code: 'BBA', description: 'Department of Management & Corporate Strategy', branchId: mainCampusId },
    { id: bcaDeptId, name: 'Computer Applications', code: 'BCA', description: 'Department of Applied Computer Applications & Web Tech', branchId: mainCampusId },
  ];

  for (const dept of departmentsData) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: { name: dept.name, code: dept.code, description: dept.description },
      create: {
        id: dept.id,
        academyId,
        branchId: dept.branchId,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        status: 'active',
      },
    });
  }

  // =========================================================================
  // 4. DEGREE PROGRAMS / COURSES
  // =========================================================================
  console.log('4. Seeding Degree Programs...');
  const btechCseId = 'c1111111-1111-1111-1111-111111111111';
  const btechIseId = 'c2222222-2222-2222-2222-222222222222';
  const btechEceId = 'c3333333-3333-3333-3333-333333333333';
  const btechAimlId = 'c4444444-4444-4444-4444-444444444444';
  const bbaId = 'c5555555-5555-5555-5555-555555555555';
  const bcaId = 'c6666666-6666-6666-6666-666666666666';

  const programsData = [
    {
      id: btechCseId,
      branchId: mainCampusId,
      departmentId: cseDeptId,
      name: 'B.Tech Computer Science & Engineering',
      code: 'BTECH-CSE',
      degreeType: 'B.Tech',
      duration: '4 Years',
      totalSemesters: 8,
      schemeYear: '2026',
      creditsRequired: 160,
      description: 'Undergraduate engineering degree in computing, algorithms, and distributed systems.',
    },
    {
      id: btechIseId,
      branchId: mainCampusId,
      departmentId: iseDeptId,
      name: 'B.Tech Information Science & Engineering',
      code: 'BTECH-ISE',
      degreeType: 'B.Tech',
      duration: '4 Years',
      totalSemesters: 8,
      schemeYear: '2026',
      creditsRequired: 160,
      description: 'Undergraduate engineering degree in information systems, software architecture & data engineering.',
    },
    {
      id: btechEceId,
      branchId: mainCampusId,
      departmentId: eceDeptId,
      name: 'B.Tech Electronics & Communication Engineering',
      code: 'BTECH-ECE',
      degreeType: 'B.Tech',
      duration: '4 Years',
      totalSemesters: 8,
      schemeYear: '2026',
      creditsRequired: 160,
      description: 'Undergraduate engineering degree in digital electronics, VLSI, and communication systems.',
    },
    {
      id: btechAimlId,
      branchId: mainCampusId,
      departmentId: aimlDeptId,
      name: 'B.Tech Artificial Intelligence & Machine Learning',
      code: 'BTECH-AIML',
      degreeType: 'B.Tech',
      duration: '4 Years',
      totalSemesters: 8,
      schemeYear: '2026',
      creditsRequired: 160,
      description: 'Specialized undergraduate degree in machine learning, deep neural networks, and computer vision.',
    },
    {
      id: bbaId,
      branchId: mainCampusId,
      departmentId: bbaDeptId,
      name: 'Bachelor of Business Administration (BBA)',
      code: 'BBA',
      degreeType: 'BBA',
      duration: '3 Years',
      totalSemesters: 6,
      schemeYear: '2026',
      creditsRequired: 120,
      description: 'Undergraduate degree in management, finance, corporate strategy, and marketing.',
    },
    {
      id: bcaId,
      branchId: mainCampusId,
      departmentId: bcaDeptId,
      name: 'Bachelor of Computer Applications (BCA)',
      code: 'BCA',
      degreeType: 'BCA',
      duration: '3 Years',
      totalSemesters: 6,
      schemeYear: '2026',
      creditsRequired: 120,
      description: 'Undergraduate program in computer applications, full-stack software development and databases.',
    },
  ];

  for (const prog of programsData) {
    await prisma.course.upsert({
      where: { id: prog.id },
      update: {
        name: prog.name,
        code: prog.code,
        departmentId: prog.departmentId,
        degreeType: prog.degreeType,
        duration: prog.duration,
        totalSemesters: prog.totalSemesters,
        schemeYear: prog.schemeYear,
        creditsRequired: prog.creditsRequired,
        description: prog.description,
      },
      create: {
        id: prog.id,
        academyId,
        branchId: prog.branchId,
        departmentId: prog.departmentId,
        name: prog.name,
        code: prog.code,
        degreeType: prog.degreeType,
        duration: prog.duration,
        totalSemesters: prog.totalSemesters,
        schemeYear: prog.schemeYear,
        creditsRequired: prog.creditsRequired,
        description: prog.description,
        status: 'active',
      },
    });
  }

  // =========================================================================
  // 5. BATCHES & SECTIONS
  // =========================================================================
  console.log('5. Seeding Batches & Sections...');
  const batchCseAId = 'ba111111-1111-1111-1111-111111111111';
  const batchCseBId = 'ba222222-2222-2222-2222-222222222222';
  const batchIseAId = 'ba333333-3333-3333-3333-333333333333';
  const batchIseBId = 'ba444444-4444-4444-4444-444444444444';
  const batchEceAId = 'ba555555-5555-5555-5555-555555555555';
  const batchAimlAId = 'ba666666-6666-6666-6666-666666666666';
  const batchBbaAId = 'ba777777-7777-7777-7777-777777777777';
  const batchBcaAId = 'ba888888-8888-8888-8888-888888888888';

  const batchesData = [
    {
      id: batchCseAId,
      branchId: mainCampusId,
      courseId: btechCseId,
      departmentId: cseDeptId,
      name: '2026-2030 B.Tech CSE - Section A',
      code: 'CSE-A',
      academicYear: '2026-27',
      currentSemester: 3,
      sectionName: 'A',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2030-06-30'),
      capacity: 60,
    },
    {
      id: batchCseBId,
      branchId: mainCampusId,
      courseId: btechCseId,
      departmentId: cseDeptId,
      name: '2026-2030 B.Tech CSE - Section B',
      code: 'CSE-B',
      academicYear: '2026-27',
      currentSemester: 3,
      sectionName: 'B',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2030-06-30'),
      capacity: 60,
    },
    {
      id: batchIseAId,
      branchId: mainCampusId,
      courseId: btechIseId,
      departmentId: iseDeptId,
      name: '2026-2030 B.Tech ISE - Section A',
      code: 'ISE-A',
      academicYear: '2026-27',
      currentSemester: 3,
      sectionName: 'A',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2030-06-30'),
      capacity: 60,
    },
    {
      id: batchIseBId,
      branchId: mainCampusId,
      courseId: btechIseId,
      departmentId: iseDeptId,
      name: '2026-2030 B.Tech ISE - Section B',
      code: 'ISE-B',
      academicYear: '2026-27',
      currentSemester: 3,
      sectionName: 'B',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2030-06-30'),
      capacity: 60,
    },
    {
      id: batchEceAId,
      branchId: mainCampusId,
      courseId: btechEceId,
      departmentId: eceDeptId,
      name: '2026-2030 B.Tech ECE - Section A',
      code: 'ECE-A',
      academicYear: '2026-27',
      currentSemester: 1,
      sectionName: 'A',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2030-06-30'),
      capacity: 60,
    },
    {
      id: batchAimlAId,
      branchId: mainCampusId,
      courseId: btechAimlId,
      departmentId: aimlDeptId,
      name: '2026-2030 B.Tech AIML - Section A',
      code: 'AIML-A',
      academicYear: '2026-27',
      currentSemester: 1,
      sectionName: 'A',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2030-06-30'),
      capacity: 60,
    },
    {
      id: batchBbaAId,
      branchId: mainCampusId,
      courseId: bbaId,
      departmentId: bbaDeptId,
      name: '2026-2029 BBA - Section A',
      code: 'BBA-A',
      academicYear: '2026-27',
      currentSemester: 2,
      sectionName: 'A',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2029-06-30'),
      capacity: 60,
    },
    {
      id: batchBcaAId,
      branchId: mainCampusId,
      courseId: bcaId,
      departmentId: bcaDeptId,
      name: '2026-2029 BCA - Section A',
      code: 'BCA-A',
      academicYear: '2026-27',
      currentSemester: 1,
      sectionName: 'A',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2029-06-30'),
      capacity: 60,
    },
  ];

  for (const b of batchesData) {
    await prisma.batch.upsert({
      where: { id: b.id },
      update: {
        name: b.name,
        code: b.code,
        departmentId: b.departmentId,
        academicYear: b.academicYear,
        currentSemester: b.currentSemester,
        sectionName: b.sectionName,
        capacity: b.capacity,
      },
      create: {
        id: b.id,
        academyId,
        branchId: b.branchId,
        courseId: b.courseId,
        departmentId: b.departmentId,
        name: b.name,
        code: b.code,
        academicYear: b.academicYear,
        currentSemester: b.currentSemester,
        sectionName: b.sectionName,
        startDate: b.startDate,
        endDate: b.endDate,
        capacity: b.capacity,
        status: 'active',
      },
    });
  }

  // =========================================================================
  // 6. FACULTY MEMBERS
  // =========================================================================
  console.log('6. Seeding Faculty Members...');
  const facultyList = [
    {
      userId: '22222222-2222-2222-2222-222222222222',
      teacherId: 'fc111111-1111-1111-1111-111111111111',
      email: 'anil.kumar@hitm.edu.in',
      firstName: 'Dr. Anil',
      lastName: 'Kumar',
      phone: '+91-9845012345',
      employeeNumber: 'FAC-CSE-01',
      departmentId: cseDeptId,
      designation: 'Professor',
      qualification: 'Ph.D. Computer Science (IISc), M.Tech (IITB)',
      experienceYears: 18,
      specialization: 'Distributed Systems & Data Structures',
    },
    {
      userId: '33333333-3333-3333-3333-333333333333',
      teacherId: 'fc222222-2222-2222-2222-222222222222',
      email: 'priya.sharma@hitm.edu.in',
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '+91-9845022222',
      employeeNumber: 'FAC-BBA-01',
      departmentId: bbaDeptId,
      designation: 'Assistant Professor',
      qualification: 'MBA Finance (IIMB), Ph.D. Management',
      experienceYears: 8,
      specialization: 'Financial Management & Corporate Accounting',
    },
    {
      userId: '44444444-4444-4444-4444-444444444444',
      teacherId: 'fc333333-3333-3333-3333-333333333333',
      email: 'sneha.nambiar@hitm.edu.in',
      firstName: 'Dr. Sneha',
      lastName: 'Nambiar',
      phone: '+91-9845033333',
      employeeNumber: 'FAC-ISE-01',
      departmentId: iseDeptId,
      designation: 'Associate Professor',
      qualification: 'Ph.D. Data Science, M.Tech CSE',
      experienceYears: 12,
      specialization: 'Database Systems & Information Architecture',
    },
    {
      userId: '55555555-5555-5555-5555-555555555555',
      teacherId: 'fc444444-4444-4444-4444-444444444444',
      email: 'kavitha.m@hitm.edu.in',
      firstName: 'Prof. Kavitha',
      lastName: 'Murthy',
      phone: '+91-9845044444',
      employeeNumber: 'FAC-AIML-01',
      departmentId: aimlDeptId,
      designation: 'Assistant Professor',
      qualification: 'M.Tech AI & Robotics (NITK)',
      experienceYears: 7,
      specialization: 'Artificial Intelligence & Neural Networks',
    },
    {
      userId: '77777777-7777-7777-7777-777777777777',
      teacherId: 'fc555555-5555-5555-5555-555555555555',
      email: 'suresh.kumar@hitm.edu.in',
      firstName: 'Prof. Suresh',
      lastName: 'Kumar',
      phone: '+91-9845055555',
      employeeNumber: 'FAC-BCA-01',
      departmentId: bcaDeptId,
      designation: 'Assistant Professor',
      qualification: 'MCA, M.Phil Computer Science',
      experienceYears: 9,
      specialization: 'Programming in C & Web Applications',
    },
  ];

  const facultyPass = await bcrypt.hash('Faculty123!', 10);
  for (const f of facultyList) {
    const user = await prisma.user.upsert({
      where: { id: f.userId },
      update: {
        email: f.email,
        firstName: f.firstName,
        lastName: f.lastName,
        phone: f.phone,
        status: 'active',
      },
      create: {
        id: f.userId,
        academyId,
        email: f.email,
        passwordHash: facultyPass,
        initialPassword: 'Faculty123!',
        firstName: f.firstName,
        lastName: f.lastName,
        phone: f.phone,
        status: 'active',
        isEmailVerified: true,
        isDefaultPassword: false,
      },
    });

    await prisma.userRole.upsert({
      where: { uq_user_role: { userId: user.id, roleId: roleFacultyId } },
      update: {},
      create: { academyId, userId: user.id, roleId: roleFacultyId },
    });

    const teacherRecord = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {
        departmentId: f.departmentId,
        designation: f.designation,
        qualification: f.qualification,
        experienceYears: f.experienceYears,
        specialization: f.specialization,
      },
      create: {
        id: f.teacherId,
        academyId,
        branchId: mainCampusId,
        departmentId: f.departmentId,
        userId: user.id,
        employeeNumber: f.employeeNumber,
        designation: f.designation,
        qualification: f.qualification,
        experienceYears: f.experienceYears,
        specialization: f.specialization,
        status: 'active',
      },
    });

    if (f.employeeNumber === 'FAC-CSE-01') {
      await prisma.department.update({
        where: { id: cseDeptId },
        data: { hodId: teacherRecord.id },
      });
    }
  }

  // =========================================================================
  // 7. SUBJECTS & CURRICULUM
  // =========================================================================
  console.log('7. Seeding Subjects...');
  const subDsId = 'cb111111-1111-1111-1111-111111111111';
  const subDbmsId = 'cb222222-2222-2222-2222-222222222222';
  const subOsId = 'cb333333-3333-3333-3333-333333333333';
  const subCnId = 'cb444444-4444-4444-4444-444444444444';
  const subOopId = 'cb555555-5555-5555-5555-555555555555';

  const subIseDsId = 'cb666666-6666-6666-6666-666666666666';
  const subIseDbmsId = 'cb777777-7777-7777-7777-777777777777';
  const subWebTechId = 'cb888888-8888-8888-8888-888888888888';
  const subSeId = 'cb999999-9999-9999-9999-999999999999';

  const subDeId = 'cbaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const subSigSysId = 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const subAnalogId = 'cbcccccc-cccc-cccc-cccc-cccccccccccc';

  const subMlId = 'cbdddddd-dddd-dddd-dddd-dddddddddddd';
  const subAiId = 'cbeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  const subPythonId = 'cbffffff-ffff-ffff-ffff-ffffffffffff';
  const subAnalyticsId = 'cb121212-1212-1212-1212-121212121212';

  const subFinMgmtId = 'cb232323-2323-2323-2323-232323232323';
  const subMktMgmtId = 'cb343434-3434-3434-3434-343434343434';
  const subBusEconId = 'cb454545-4545-4545-4545-454545454545';
  const subHrmId = 'cb565656-5656-5656-5656-565656565656';

  const subProgCId = 'cb676767-6767-6767-6767-676767676767';
  const subBcaDbmsId = 'cb787878-7878-7878-7878-787878787878';
  const subBcaWebId = 'cb898989-8989-8989-8989-898989898989';
  const subBcaCnId = 'cb909090-9090-9090-9090-909090909090';

  const subjectsData = [
    // CSE
    { id: subDsId, courseId: btechCseId, departmentId: cseDeptId, semester: 3, name: 'Data Structures', code: 'CS301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Arrays, Stacks, Queues, Linked Lists, Trees and Graphs' },
    { id: subDbmsId, courseId: btechCseId, departmentId: cseDeptId, semester: 3, name: 'Database Management Systems', code: 'CS302', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Relational Model, SQL, Normalization, ACID Properties and Indexing' },
    { id: subOsId, courseId: btechCseId, departmentId: cseDeptId, semester: 3, name: 'Operating Systems', code: 'CS303', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Process Synchronization, Memory Management and File Systems' },
    { id: subCnId, courseId: btechCseId, departmentId: cseDeptId, semester: 4, name: 'Computer Networks', code: 'CS401', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'OSI Model, TCP/IP, Routing Protocols and Network Security' },
    { id: subOopId, courseId: btechCseId, departmentId: cseDeptId, semester: 2, name: 'Object Oriented Programming', code: 'CS201', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Classes, Objects, Inheritance, Polymorphism and Design Patterns' },

    // ISE
    { id: subIseDsId, courseId: btechIseId, departmentId: iseDeptId, semester: 3, name: 'Data Structures', code: 'IS301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Advanced Data Structures and Algorithm Analysis' },
    { id: subIseDbmsId, courseId: btechIseId, departmentId: iseDeptId, semester: 3, name: 'Database Management Systems', code: 'IS302', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Distributed Database Systems and SQL Query Optimization' },
    { id: subWebTechId, courseId: btechIseId, departmentId: iseDeptId, semester: 3, name: 'Web Technologies', code: 'IS303', subjectType: 'lab', credits: 4, internalMarks: 50, externalMarks: 50, totalMarks: 100, passingMarks: 40, description: 'HTML5, CSS3, JavaScript, React and RESTful Web Services' },
    { id: subSeId, courseId: btechIseId, departmentId: iseDeptId, semester: 4, name: 'Software Engineering', code: 'IS401', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Agile Methodologies, Software Architecture, Testing and DevOps' },

    // ECE
    { id: subDeId, courseId: btechEceId, departmentId: eceDeptId, semester: 3, name: 'Digital Electronics', code: 'EC301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Logic Gates, Flip-Flops, Combinational and Sequential Circuits' },
    { id: subSigSysId, courseId: btechEceId, departmentId: eceDeptId, semester: 3, name: 'Signals and Systems', code: 'EC302', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Continuous & Discrete Signals, Fourier Transform and Laplace Transform' },
    { id: subAnalogId, courseId: btechEceId, departmentId: eceDeptId, semester: 3, name: 'Analog Electronics', code: 'EC303', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Op-Amps, BJT, MOSFET and Amplification Circuits' },

    // AIML
    { id: subMlId, courseId: btechAimlId, departmentId: aimlDeptId, semester: 3, name: 'Machine Learning', code: 'AI301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Supervised Learning, Unsupervised Learning and Model Evaluation' },
    { id: subAiId, courseId: btechAimlId, departmentId: aimlDeptId, semester: 1, name: 'Artificial Intelligence', code: 'AI101', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Heuristic Search, Knowledge Representation and Logic Agents' },
    { id: subPythonId, courseId: btechAimlId, departmentId: aimlDeptId, semester: 1, name: 'Python Programming', code: 'AI102', subjectType: 'lab', credits: 3, internalMarks: 50, externalMarks: 50, totalMarks: 100, passingMarks: 40, description: 'Python Fundamentals, NumPy, Pandas, Matplotlib and SciPy' },
    { id: subAnalyticsId, courseId: btechAimlId, departmentId: aimlDeptId, semester: 3, name: 'Data Analytics', code: 'AI302', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Exploratory Data Analysis, Statistical Inference and Big Data' },

    // BBA
    { id: subFinMgmtId, courseId: bbaId, departmentId: bbaDeptId, semester: 2, name: 'Financial Management', code: 'BB201', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Capital Budgeting, Working Capital Management and Financial Analysis' },
    { id: subMktMgmtId, courseId: bbaId, departmentId: bbaDeptId, semester: 2, name: 'Marketing Management', code: 'BB202', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Market Segmentation, Product Strategy, Pricing and Promotion' },
    { id: subBusEconId, courseId: bbaId, departmentId: bbaDeptId, semester: 1, name: 'Business Economics', code: 'BB101', subjectType: 'theory', credits: 3, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Demand & Supply, Cost Theory, Market Structures and Macroeconomics' },
    { id: subHrmId, courseId: bbaId, departmentId: bbaDeptId, semester: 2, name: 'Human Resource Management', code: 'BB203', subjectType: 'theory', credits: 3, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Recruitment, Performance Appraisal, Compensation and Training' },

    // BCA
    { id: subProgCId, courseId: bcaId, departmentId: bcaDeptId, semester: 1, name: 'Programming in C', code: 'CA101', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'C Fundamentals, Pointers, Structures, File I/O and Dynamic Memory' },
    { id: subBcaDbmsId, courseId: bcaId, departmentId: bcaDeptId, semester: 2, name: 'Database Management Systems', code: 'CA201', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Relational Database Design and SQL Development' },
    { id: subBcaWebId, courseId: bcaId, departmentId: bcaDeptId, semester: 2, name: 'Web Development', code: 'CA202', subjectType: 'lab', credits: 4, internalMarks: 50, externalMarks: 50, totalMarks: 100, passingMarks: 40, description: 'Full Stack Web Applications with Node.js and PostgreSQL' },
    { id: subBcaCnId, courseId: bcaId, departmentId: bcaDeptId, semester: 3, name: 'Computer Networks', code: 'CA301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Data Communications, Protocols and Internet Technologies' },
  ];

  for (const s of subjectsData) {
    await prisma.subject.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        code: s.code,
        departmentId: s.departmentId,
        semester: s.semester,
        subjectType: s.subjectType,
        credits: s.credits,
        internalMarks: s.internalMarks,
        externalMarks: s.externalMarks,
        totalMarks: s.totalMarks,
        passingMarks: s.passingMarks,
        description: s.description,
      },
      create: {
        id: s.id,
        academyId,
        courseId: s.courseId,
        departmentId: s.departmentId,
        semester: s.semester,
        name: s.name,
        code: s.code,
        subjectType: s.subjectType,
        credits: s.credits,
        internalMarks: s.internalMarks,
        externalMarks: s.externalMarks,
        totalMarks: s.totalMarks,
        passingMarks: s.passingMarks,
        description: s.description,
        status: 'active',
      },
    });
  }

  // Mapped Faculty to Subjects (TeacherSubject)
  const teacherSub1Id = 'ea111111-1111-1111-1111-111111111111';
  const teacherSub2Id = 'ea222222-2222-2222-2222-222222222222';
  const teacherSub3Id = 'ea333333-3333-3333-3333-333333333333';
  const teacherSub4Id = 'ea444444-4444-4444-4444-444444444444';
  const teacherSub5Id = 'ea555555-5555-5555-5555-555555555555';

  const teacherSubjects = [
    { id: teacherSub1Id, teacherId: 'fc111111-1111-1111-1111-111111111111', subjectId: subDsId, courseId: btechCseId, batchId: batchCseAId },
    { id: teacherSub2Id, teacherId: 'fc111111-1111-1111-1111-111111111111', subjectId: subDbmsId, courseId: btechCseId, batchId: batchCseAId },
    { id: teacherSub3Id, teacherId: 'fc222222-2222-2222-2222-222222222222', subjectId: subFinMgmtId, courseId: bbaId, batchId: batchBbaAId },
    { id: teacherSub4Id, teacherId: 'fc333333-3333-3333-3333-333333333333', subjectId: subWebTechId, courseId: btechIseId, batchId: batchIseAId },
    { id: teacherSub5Id, teacherId: 'fc444444-4444-4444-4444-444444444444', subjectId: subMlId, courseId: btechAimlId, batchId: batchAimlAId },
  ];

  for (const ts of teacherSubjects) {
    await prisma.teacherSubject.upsert({
      where: { id: ts.id },
      update: {},
      create: {
        id: ts.id,
        academyId,
        branchId: mainCampusId,
        teacherId: ts.teacherId,
        subjectId: ts.subjectId,
        courseId: ts.courseId,
        batchId: ts.batchId,
      },
    });
  }

  // =========================================================================
  // 8. STUDENTS (DEGREE CANDIDATES)
  // =========================================================================
  console.log('8. Seeding Degree Students...');
  const studentUser1Id = '61111111-1111-1111-1111-111111111111';
  const studentUser2Id = '62222222-2222-2222-2222-222222222222';
  const studentUser3Id = '63333333-3333-3333-3333-333333333333';
  const studentUser4Id = '64444444-4444-4444-4444-444444444444';

  const student1Id = 'da111111-1111-1111-1111-111111111111';
  const student2Id = 'da222222-2222-2222-2222-222222222222';
  const student3Id = 'da333333-3333-3333-3333-333333333333';
  const student4Id = 'da444444-4444-4444-4444-444444444444';

  const studentsList = [
    {
      userId: studentUser1Id,
      studentId: student1Id,
      email: 'arjun.kumar@hitm.edu.in',
      firstName: 'Arjun',
      lastName: 'Kumar',
      phone: '+91-9741011111',
      courseId: btechCseId,
      batchId: batchCseAId,
      departmentId: cseDeptId,
      semester: 3,
      section: 'A',
      admissionNumber: 'ADM-2025-CSE-001',
      rollNumber: '1HY25CS001',
      universityRegNumber: 'USN-2025-CS-001',
      admissionYear: '2025',
      parentName: 'Ramesh Kumar',
      parentPhone: '+91-9741099991',
      parentEmail: 'ramesh.kumar@gmail.com',
      dateOfBirth: new Date('2007-05-14'),
      gender: 'male',
      bloodGroup: 'O+',
    },
    {
      userId: studentUser2Id,
      studentId: student2Id,
      email: 'sneha.r@hitm.edu.in',
      firstName: 'Sneha',
      lastName: 'R',
      phone: '+91-9741022222',
      courseId: btechIseId,
      batchId: batchIseAId,
      departmentId: iseDeptId,
      semester: 3,
      section: 'A',
      admissionNumber: 'ADM-2025-ISE-001',
      rollNumber: '1HY25IS001',
      universityRegNumber: 'USN-2025-IS-001',
      admissionYear: '2025',
      parentName: 'Ranganathan S',
      parentPhone: '+91-9741099992',
      parentEmail: 'ranga.s@gmail.com',
      dateOfBirth: new Date('2007-08-22'),
      gender: 'female',
      bloodGroup: 'A+',
    },
    {
      userId: studentUser3Id,
      studentId: student3Id,
      email: 'rahul.sharma@hitm.edu.in',
      firstName: 'Rahul',
      lastName: 'Sharma',
      phone: '+91-9741033333',
      courseId: bbaId,
      batchId: batchBbaAId,
      departmentId: bbaDeptId,
      semester: 2,
      section: 'A',
      admissionNumber: 'ADM-2026-BBA-001',
      rollNumber: '1HY26BB001',
      universityRegNumber: 'USN-2026-BB-001',
      admissionYear: '2026',
      parentName: 'Sanjay Sharma',
      parentPhone: '+91-9741099993',
      parentEmail: 'sanjay.sharma@gmail.com',
      dateOfBirth: new Date('2008-02-18'),
      gender: 'male',
      bloodGroup: 'B+',
    },
    {
      userId: studentUser4Id,
      studentId: student4Id,
      email: 'priya.patel@hitm.edu.in',
      firstName: 'Priya',
      lastName: 'Patel',
      phone: '+91-9741044444',
      courseId: btechCseId,
      batchId: batchCseAId,
      departmentId: cseDeptId,
      semester: 1,
      section: 'A',
      admissionNumber: 'ADM-2026-CSE-002',
      rollNumber: '1HY26CS002',
      universityRegNumber: 'USN-2026-CS-002',
      admissionYear: '2026',
      parentName: 'Sunil Patel',
      parentPhone: '+91-9741099994',
      parentEmail: 'sunil.patel@gmail.com',
      dateOfBirth: new Date('2008-09-12'),
      gender: 'female',
      bloodGroup: 'AB+',
    },
  ];

  const studentPass = await bcrypt.hash('Student123!', 10);
  for (const st of studentsList) {
    const user = await prisma.user.upsert({
      where: { id: st.userId },
      update: {
        email: st.email,
        firstName: st.firstName,
        lastName: st.lastName,
        phone: st.phone,
        status: 'active',
      },
      create: {
        id: st.userId,
        academyId,
        email: st.email,
        passwordHash: studentPass,
        initialPassword: 'Student123!',
        firstName: st.firstName,
        lastName: st.lastName,
        phone: st.phone,
        status: 'active',
        isEmailVerified: true,
        isDefaultPassword: false,
      },
    });

    await prisma.userRole.upsert({
      where: { uq_user_role: { userId: user.id, roleId: roleStudentId } },
      update: {},
      create: { academyId, userId: user.id, roleId: roleStudentId },
    });

    await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        courseId: st.courseId,
        batchId: st.batchId,
        departmentId: st.departmentId,
        semester: st.semester,
        section: st.section,
        rollNumber: st.rollNumber,
        universityRegNumber: st.universityRegNumber,
        admissionYear: st.admissionYear,
        parentName: st.parentName,
        parentPhone: st.parentPhone,
        parentEmail: st.parentEmail,
      },
      create: {
        id: st.studentId,
        academyId,
        branchId: mainCampusId,
        userId: user.id,
        courseId: st.courseId,
        batchId: st.batchId,
        departmentId: st.departmentId,
        semester: st.semester,
        section: st.section,
        admissionNumber: st.admissionNumber,
        rollNumber: st.rollNumber,
        universityRegNumber: st.universityRegNumber,
        admissionYear: st.admissionYear,
        admissionDate: new Date(),
        dateOfBirth: st.dateOfBirth,
        gender: st.gender,
        bloodGroup: st.bloodGroup,
        parentName: st.parentName,
        parentPhone: st.parentPhone,
        parentEmail: st.parentEmail,
        studentStatus: 'active',
      },
    });
  }

  // =========================================================================
  // 9. TIMETABLE SCHEDULES
  // =========================================================================
  console.log('9. Seeding Timetable Schedules...');
  const timetableEntries = [
    {
      id: 'cf111111-1111-1111-1111-111111111111',
      branchId: mainCampusId,
      departmentId: cseDeptId,
      courseId: btechCseId,
      batchId: batchCseAId,
      subjectId: subDsId,
      teacherId: 'fc111111-1111-1111-1111-111111111111', // Dr. Anil Kumar
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      roomNumber: 'Room 301',
    },
    {
      id: 'cf222222-2222-2222-2222-222222222222',
      branchId: mainCampusId,
      departmentId: cseDeptId,
      courseId: btechCseId,
      batchId: batchCseAId,
      subjectId: subOsId,
      teacherId: 'fc111111-1111-1111-1111-111111111111', // Dr. Anil Kumar
      dayOfWeek: 'Monday',
      startTime: '10:00',
      endTime: '11:00',
      roomNumber: 'Room 301',
    },
    {
      id: 'cf333333-3333-3333-3333-333333333333',
      branchId: mainCampusId,
      departmentId: cseDeptId,
      courseId: btechCseId,
      batchId: batchCseAId,
      subjectId: subDbmsId,
      teacherId: 'fc111111-1111-1111-1111-111111111111', // Dr. Anil Kumar
      dayOfWeek: 'Tuesday',
      startTime: '10:00',
      endTime: '11:00',
      roomNumber: 'Room 302',
    },
    {
      id: 'cf444444-4444-4444-4444-444444444444',
      branchId: mainCampusId,
      departmentId: iseDeptId,
      courseId: btechIseId,
      batchId: batchIseAId,
      subjectId: subWebTechId,
      teacherId: 'fc333333-3333-3333-3333-333333333333', // Dr. Sneha Nambiar
      dayOfWeek: 'Wednesday',
      startTime: '11:00',
      endTime: '12:00',
      roomNumber: 'Room 204',
    },
    {
      id: 'cf555555-5555-5555-5555-555555555555',
      branchId: mainCampusId,
      departmentId: bbaDeptId,
      courseId: bbaId,
      batchId: batchBbaAId,
      subjectId: subFinMgmtId,
      teacherId: 'fc222222-2222-2222-2222-222222222222', // Priya Sharma
      dayOfWeek: 'Thursday',
      startTime: '09:30',
      endTime: '10:30',
      roomNumber: 'Room 105',
    },
    {
      id: 'cf666666-6666-6666-6666-666666666666',
      branchId: mainCampusId,
      departmentId: aimlDeptId,
      courseId: btechAimlId,
      batchId: batchAimlAId,
      subjectId: subMlId,
      teacherId: 'fc444444-4444-4444-4444-444444444444', // Prof. Kavitha
      dayOfWeek: 'Friday',
      startTime: '14:00',
      endTime: '15:00',
      roomNumber: 'AI Lab 2',
    },
  ];

  for (const t of timetableEntries) {
    await prisma.timetableSchedule.upsert({
      where: { id: t.id },
      update: {
        startTime: t.startTime,
        endTime: t.endTime,
        roomNumber: t.roomNumber,
      },
      create: {
        id: t.id,
        academyId,
        branchId: t.branchId,
        departmentId: t.departmentId,
        courseId: t.courseId,
        batchId: t.batchId,
        subjectId: t.subjectId,
        teacherId: t.teacherId,
        dayOfWeek: t.dayOfWeek,
        startTime: t.startTime,
        endTime: t.endTime,
        roomNumber: t.roomNumber,
        status: 'active',
      },
    });
  }

  // =========================================================================
  // 10. ATTENDANCE SESSIONS & ATTENDANCE RECORDS
  // =========================================================================
  console.log('10. Seeding Attendance Records...');
  const attSession1Id = 'ec111111-1111-1111-1111-111111111111';
  const attSession2Id = 'ec222222-2222-2222-2222-222222222222';
  const attSession3Id = 'ec333333-3333-3333-3333-333333333333';

  // Session 1: Data Structures for CSE-A
  await prisma.attendance.upsert({
    where: { id: attSession1Id },
    update: { branchId: mainCampusId, totalStudents: 2, presentCount: 2, absentCount: 0 },
    create: {
      id: attSession1Id,
      academyId,
      branchId: mainCampusId,
      batchId: batchCseAId,
      subjectId: subDsId,
      teacherId: 'fc111111-1111-1111-1111-111111111111',
      date: new Date('2026-09-14'),
      totalStudents: 2,
      presentCount: 2,
      absentCount: 0,
    },
  });

  await prisma.attendanceRecord.upsert({
    where: { uq_attendance_record: { attendanceId: attSession1Id, studentId: student1Id } },
    update: { status: 'present' },
    create: {
      attendanceId: attSession1Id,
      studentId: student1Id, // Arjun Kumar
      status: 'present',
    },
  });

  await prisma.attendanceRecord.upsert({
    where: { uq_attendance_record: { attendanceId: attSession1Id, studentId: student4Id } },
    update: { status: 'present' },
    create: {
      attendanceId: attSession1Id,
      studentId: student4Id, // Priya Patel
      status: 'present',
    },
  });

  // Session 2: DBMS for CSE-A
  await prisma.attendance.upsert({
    where: { id: attSession2Id },
    update: { branchId: mainCampusId, totalStudents: 1, presentCount: 1, absentCount: 0 },
    create: {
      id: attSession2Id,
      academyId,
      branchId: mainCampusId,
      batchId: batchCseAId,
      subjectId: subDbmsId,
      teacherId: 'fc111111-1111-1111-1111-111111111111',
      date: new Date('2026-09-15'),
      totalStudents: 1,
      presentCount: 1,
      absentCount: 0,
    },
  });

  await prisma.attendanceRecord.upsert({
    where: { uq_attendance_record: { attendanceId: attSession2Id, studentId: student1Id } },
    update: { status: 'present' },
    create: {
      attendanceId: attSession2Id,
      studentId: student1Id,
      status: 'present',
    },
  });

  // Session 3: Web Tech for ISE-A (Sneha R Absent for DS, Present for Web)
  await prisma.attendance.upsert({
    where: { id: attSession3Id },
    update: { branchId: mainCampusId, totalStudents: 1, presentCount: 0, absentCount: 1 },
    create: {
      id: attSession3Id,
      academyId,
      branchId: mainCampusId,
      batchId: batchIseAId,
      subjectId: subIseDsId,
      teacherId: 'fc333333-3333-3333-3333-333333333333',
      date: new Date('2026-09-15'),
      totalStudents: 1,
      presentCount: 0,
      absentCount: 1,
    },
  });

  await prisma.attendanceRecord.upsert({
    where: { uq_attendance_record: { attendanceId: attSession3Id, studentId: student2Id } },
    update: { status: 'absent', remarks: 'Medical leave submitted' },
    create: {
      attendanceId: attSession3Id,
      studentId: student2Id, // Sneha R
      status: 'absent',
      remarks: 'Medical leave submitted',
    },
  });

  // =========================================================================
  // 11. EXAMINATIONS, PAPERS & MARKS
  // =========================================================================
  console.log('11. Seeding Examinations & Marks...');
  const examId = 'ee111111-1111-1111-1111-111111111111';
  const paperDsId = 'ee222222-2222-2222-2222-222222222222';
  const paperDbmsId = 'ee333333-3333-3333-3333-333333333333';
  const paperFinId = 'ee444444-4444-4444-4444-444444444444';

  await prisma.exam.upsert({
    where: { id: examId },
    update: { name: 'Semester 3 Internal Assessment & End-Term Exam', examType: 'term' },
    create: {
      id: examId,
      academyId,
      name: 'Semester 3 Internal Assessment & End-Term Exam',
      description: 'Continuous Internal Evaluation (CIE) and Semester End Examination (SEE)',
      examType: 'term',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-20'),
    },
  });

  // Papers
  await prisma.examPaper.upsert({
    where: { id: paperDsId },
    update: { maxMarks: 100, passingMarks: 40, durationMinutes: 180 },
    create: {
      id: paperDsId,
      academyId,
      examId,
      subjectId: subDsId,
      batchId: batchCseAId,
      examDate: new Date('2026-09-10'),
      startTime: '09:30',
      durationMinutes: 180,
      maxMarks: 100,
      passingMarks: 40,
    },
  });

  await prisma.examPaper.upsert({
    where: { id: paperDbmsId },
    update: { maxMarks: 100, passingMarks: 40, durationMinutes: 180 },
    create: {
      id: paperDbmsId,
      academyId,
      examId,
      subjectId: subDbmsId,
      batchId: batchCseAId,
      examDate: new Date('2026-09-12'),
      startTime: '09:30',
      durationMinutes: 180,
      maxMarks: 100,
      passingMarks: 40,
    },
  });

  await prisma.examPaper.upsert({
    where: { id: paperFinId },
    update: { maxMarks: 100, passingMarks: 40, durationMinutes: 180 },
    create: {
      id: paperFinId,
      academyId,
      examId,
      subjectId: subFinMgmtId,
      batchId: batchBbaAId,
      examDate: new Date('2026-09-14'),
      startTime: '09:30',
      durationMinutes: 180,
      maxMarks: 100,
      passingMarks: 40,
    },
  });

  // Results & Marks
  // Arjun Kumar: Data Structures (38 internal + 45 external = 83/100) -> Grade A+
  await prisma.examResult.upsert({
    where: { uq_exam_result: { examPaperId: paperDsId, studentId: student1Id } },
    update: {
      marksObtained: 83.00,
      status: 'pass',
      remarks: 'Internal: 38/40, External: 45/60 (Grade A+)',
    },
    create: {
      academyId,
      examPaperId: paperDsId,
      studentId: student1Id,
      marksObtained: 83.00,
      status: 'pass',
      remarks: 'Internal: 38/40, External: 45/60 (Grade A+)',
      gradedBy: adminUserId,
    },
  });

  // Sneha R: DBMS (34 internal + 48 external = 82/100) -> Grade A+
  await prisma.examResult.upsert({
    where: { uq_exam_result: { examPaperId: paperDbmsId, studentId: student2Id } },
    update: {
      marksObtained: 82.00,
      status: 'pass',
      remarks: 'Internal: 34/40, External: 48/60 (Grade A+)',
    },
    create: {
      academyId,
      examPaperId: paperDbmsId,
      studentId: student2Id,
      marksObtained: 82.00,
      status: 'pass',
      remarks: 'Internal: 34/40, External: 48/60 (Grade A+)',
      gradedBy: adminUserId,
    },
  });

  // Rahul Sharma: Financial Management (35 internal + 50 external = 85/100) -> Grade A+
  await prisma.examResult.upsert({
    where: { uq_exam_result: { examPaperId: paperFinId, studentId: student3Id } },
    update: {
      marksObtained: 85.00,
      status: 'pass',
      remarks: 'Internal: 35/40, External: 50/60 (Grade A+)',
    },
    create: {
      academyId,
      examPaperId: paperFinId,
      studentId: student3Id,
      marksObtained: 85.00,
      status: 'pass',
      remarks: 'Internal: 35/40, External: 50/60 (Grade A+)',
      gradedBy: adminUserId,
    },
  });

  // =========================================================================
  // 12. GRADING SCHEME & SEMESTER GRADES (SGPA / CGPA)
  // =========================================================================
  console.log('12. Seeding Grading Scheme & SGPA / CGPA...');
  await prisma.gradingScheme.upsert({
    where: { id: 'de111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: 'de111111-1111-1111-1111-111111111111',
      academyId,
      name: 'UGC / VTU 10-Point Absolute Scale',
      gradeScale: [
        { grade: 'O', points: 10, minMarks: 90, maxMarks: 100, label: 'Outstanding' },
        { grade: 'A+', points: 9, minMarks: 80, maxMarks: 89, label: 'Excellent' },
        { grade: 'A', points: 8, minMarks: 70, maxMarks: 79, label: 'Very Good' },
        { grade: 'B+', points: 7, minMarks: 60, maxMarks: 69, label: 'Good' },
        { grade: 'B', points: 6, minMarks: 50, maxMarks: 59, label: 'Above Average' },
        { grade: 'C', points: 5, minMarks: 45, maxMarks: 49, label: 'Average' },
        { grade: 'P', points: 4, minMarks: 40, maxMarks: 44, label: 'Pass' },
        { grade: 'F', points: 0, minMarks: 0, maxMarks: 39, label: 'Fail / Backlog' },
      ],
      isDefault: true,
    },
  });

  // Arjun Kumar Semester Grades
  await prisma.studentSemesterGrade.upsert({
    where: { uq_student_semester_grade: { studentId: student1Id, semester: 1 } },
    update: { sgpa: 8.85, cgpa: 8.85 },
    create: {
      academyId,
      studentId: student1Id,
      courseId: btechCseId,
      semester: 1,
      academicYear: '2025-26',
      sgpa: 8.85,
      cgpa: 8.85,
      totalCreditsEarned: 20,
      backlogsCount: 0,
      status: 'passed',
    },
  });

  await prisma.studentSemesterGrade.upsert({
    where: { uq_student_semester_grade: { studentId: student1Id, semester: 2 } },
    update: { sgpa: 9.10, cgpa: 8.98 },
    create: {
      academyId,
      studentId: student1Id,
      courseId: btechCseId,
      semester: 2,
      academicYear: '2025-26',
      sgpa: 9.10,
      cgpa: 8.98,
      totalCreditsEarned: 22,
      backlogsCount: 0,
      status: 'passed',
    },
  });

  // Sneha R Semester Grades
  await prisma.studentSemesterGrade.upsert({
    where: { uq_student_semester_grade: { studentId: student2Id, semester: 1 } },
    update: { sgpa: 8.70, cgpa: 8.70 },
    create: {
      academyId,
      studentId: student2Id,
      courseId: btechIseId,
      semester: 1,
      academicYear: '2025-26',
      sgpa: 8.70,
      cgpa: 8.70,
      totalCreditsEarned: 20,
      backlogsCount: 0,
      status: 'passed',
    },
  });

  await prisma.studentSemesterGrade.upsert({
    where: { uq_student_semester_grade: { studentId: student2Id, semester: 2 } },
    update: { sgpa: 8.95, cgpa: 8.83 },
    create: {
      academyId,
      studentId: student2Id,
      courseId: btechIseId,
      semester: 2,
      academicYear: '2025-26',
      sgpa: 8.95,
      cgpa: 8.83,
      totalCreditsEarned: 22,
      backlogsCount: 0,
      status: 'passed',
    },
  });

  // Rahul Sharma Semester Grades
  await prisma.studentSemesterGrade.upsert({
    where: { uq_student_semester_grade: { studentId: student3Id, semester: 1 } },
    update: { sgpa: 8.50, cgpa: 8.50 },
    create: {
      academyId,
      studentId: student3Id,
      courseId: bbaId,
      semester: 1,
      academicYear: '2026-27',
      sgpa: 8.50,
      cgpa: 8.50,
      totalCreditsEarned: 20,
      backlogsCount: 0,
      status: 'passed',
    },
  });

  // =========================================================================
  // 13. FEE STRUCTURES, ALLOCATIONS & STUDENT PAYMENTS
  // =========================================================================
  console.log('13. Seeding Fee Structures & Payments...');
  const feeCseTuitionId = 'fe111111-1111-1111-1111-111111111111';
  const feeCseLabId = 'fe222222-2222-2222-2222-222222222222';
  const feeCseExamId = 'fe333333-3333-3333-3333-333333333333';
  const feeCseOtherId = 'fe444444-4444-4444-4444-444444444444';

  const feeBbaTuitionId = 'fe555555-5555-5555-5555-555555555555';
  const feeBbaOtherId = 'fe666666-6666-6666-6666-666666666666';

  // B.Tech CSE Fee Items
  await prisma.feeStructure.upsert({
    where: { id: feeCseTuitionId },
    update: { amount: 100000, frequency: 'annual' },
    create: {
      id: feeCseTuitionId,
      academyId,
      name: 'B.Tech CSE Tuition Fee',
      description: 'Annual Academic Tuition Fee for B.Tech CSE 2026-27',
      amount: 100000,
      frequency: 'annual',
    },
  });

  await prisma.feeStructure.upsert({
    where: { id: feeCseLabId },
    update: { amount: 10000, frequency: 'annual' },
    create: {
      id: feeCseLabId,
      academyId,
      name: 'B.Tech Computing & AI Lab Fee',
      description: 'Annual Laboratory and Cloud Infrastructure Fee',
      amount: 10000,
      frequency: 'annual',
    },
  });

  await prisma.feeStructure.upsert({
    where: { id: feeCseExamId },
    update: { amount: 5000, frequency: 'annual' },
    create: {
      id: feeCseExamId,
      academyId,
      name: 'University & Examination Fee',
      description: 'University Registration, Library & Examination Fee',
      amount: 5000,
      frequency: 'annual',
    },
  });

  await prisma.feeStructure.upsert({
    where: { id: feeCseOtherId },
    update: { amount: 5000, frequency: 'annual' },
    create: {
      id: feeCseOtherId,
      academyId,
      name: 'Campus Amenity & Other Fee',
      description: 'Sports, Cultural and Student Activity Fund',
      amount: 5000,
      frequency: 'annual',
    },
  });

  // BBA Fee Items
  await prisma.feeStructure.upsert({
    where: { id: feeBbaTuitionId },
    update: { amount: 60000, frequency: 'annual' },
    create: {
      id: feeBbaTuitionId,
      academyId,
      name: 'BBA Annual Tuition Fee',
      description: 'Academic Tuition Fee for BBA Program',
      amount: 60000,
      frequency: 'annual',
    },
  });

  await prisma.feeStructure.upsert({
    where: { id: feeBbaOtherId },
    update: { amount: 10000, frequency: 'annual' },
    create: {
      id: feeBbaOtherId,
      academyId,
      name: 'BBA Campus & Development Fee',
      description: 'Management Club, Case Studies & Library Access',
      amount: 10000,
      frequency: 'annual',
    },
  });

  // Fee Allocations & Payments
  // 1. Arjun Kumar (B.Tech CSE Total = ₹120,000, Paid = ₹70,000, Pending = ₹50,000)
  const allocArjunId = 'af111111-1111-1111-1111-111111111111';
  await prisma.feeAllocation.upsert({
    where: { id: allocArjunId },
    update: { totalAmount: 120000, paidAmount: 70000, status: 'partially_paid' },
    create: {
      id: allocArjunId,
      academyId,
      studentId: student1Id,
      feeStructureId: feeCseTuitionId,
      totalAmount: 120000,
      paidAmount: 70000,
      dueDate: new Date('2026-10-31'),
      status: 'partially_paid',
    },
  });

  const payArjunId = 'bf111111-1111-1111-1111-111111111111';
  await prisma.payment.upsert({
    where: { id: payArjunId },
    update: { amountPaid: 70000 },
    create: {
      id: payArjunId,
      academyId,
      feeAllocationId: allocArjunId,
      amountPaid: 70000,
      receiptNumber: 'REC-2026-001',
      paymentMode: 'UPI',
      referenceNo: 'UPI-REF-9812739182',
      remarks: 'First installment of ₹70,000 paid. Pending balance: ₹50,000',
      recordedBy: adminUserId,
    },
  });

  // 2. Rahul Sharma (BBA Total = ₹70,000, Paid = ₹40,000, Pending = ₹30,000)
  const allocRahulId = 'af222222-2222-2222-2222-222222222222';
  await prisma.feeAllocation.upsert({
    where: { id: allocRahulId },
    update: { totalAmount: 70000, paidAmount: 40000, status: 'partially_paid' },
    create: {
      id: allocRahulId,
      academyId,
      studentId: student3Id,
      feeStructureId: feeBbaTuitionId,
      totalAmount: 70000,
      paidAmount: 40000,
      dueDate: new Date('2026-10-31'),
      status: 'partially_paid',
    },
  });

  const payRahulId = 'bf222222-2222-2222-2222-222222222222';
  await prisma.payment.upsert({
    where: { id: payRahulId },
    update: { amountPaid: 40000 },
    create: {
      id: payRahulId,
      academyId,
      feeAllocationId: allocRahulId,
      amountPaid: 40000,
      receiptNumber: 'REC-2026-002',
      paymentMode: 'NetBanking',
      referenceNo: 'HDFC-REF-712398123',
      remarks: 'First installment of ₹40,000 paid. Pending balance: ₹30,000',
      recordedBy: adminUserId,
    },
  });

  // 3. Sneha R (B.Tech ISE Total = ₹120,000, Paid = ₹120,000, Pending = ₹0)
  const allocSnehaId = 'af333333-3333-3333-3333-333333333333';
  await prisma.feeAllocation.upsert({
    where: { id: allocSnehaId },
    update: { totalAmount: 120000, paidAmount: 120000, status: 'paid' },
    create: {
      id: allocSnehaId,
      academyId,
      studentId: student2Id,
      feeStructureId: feeCseTuitionId,
      totalAmount: 120000,
      paidAmount: 120000,
      dueDate: new Date('2026-10-31'),
      status: 'paid',
    },
  });

  const paySnehaId = 'bf333333-3333-3333-3333-333333333333';
  await prisma.payment.upsert({
    where: { id: paySnehaId },
    update: { amountPaid: 120000 },
    create: {
      id: paySnehaId,
      academyId,
      feeAllocationId: allocSnehaId,
      amountPaid: 120000,
      receiptNumber: 'REC-2026-003',
      paymentMode: 'Card',
      referenceNo: 'CARD-REF-481923019',
      remarks: 'Full annual tuition paid in single installment.',
      recordedBy: adminUserId,
    },
  });

  // =========================================================================
  // 14. PLACEMENT DRIVES & APPLICATIONS
  // =========================================================================
  console.log('14. Seeding Placement Drives...');
  const driveTcsId = 'db111111-1111-1111-1111-111111111111';
  const driveInfyId = 'db222222-2222-2222-2222-222222222222';
  const driveAccId = 'db333333-3333-3333-3333-333333333333';

  await prisma.placementDrive.upsert({
    where: { id: driveTcsId },
    update: { companyName: 'TCS (Tata Consultancy Services)', packageLpa: 7.50 },
    create: {
      id: driveTcsId,
      academyId,
      companyName: 'TCS (Tata Consultancy Services)',
      jobRole: 'Digital System Engineer (SDE)',
      packageLpa: 7.50,
      eligibilityCriteria: 'B.Tech CSE / ISE / ECE with CGPA >= 7.0 and no active backlogs.',
      driveDate: new Date('2026-10-15'),
      deadlineDate: new Date('2026-10-05'),
      location: 'HITM Main Auditorium & Online',
      jobType: 'Full-time',
      status: 'open',
    },
  });

  await prisma.placementDrive.upsert({
    where: { id: driveInfyId },
    update: { companyName: 'Infosys BPM & Tech Services', packageLpa: 9.50 },
    create: {
      id: driveInfyId,
      academyId,
      companyName: 'Infosys BPM & Tech Services',
      jobRole: 'Specialist Programmer',
      packageLpa: 9.50,
      eligibilityCriteria: 'All Engineering & BCA graduates with CGPA >= 7.5.',
      driveDate: new Date('2026-10-28'),
      deadlineDate: new Date('2026-10-20'),
      location: 'Electronic City, Bangalore',
      jobType: 'Full-time',
      status: 'open',
    },
  });

  await prisma.placementDrive.upsert({
    where: { id: driveAccId },
    update: { companyName: 'Accenture India', packageLpa: 6.50 },
    create: {
      id: driveAccId,
      academyId,
      companyName: 'Accenture India',
      jobRole: 'Associate Software Engineer (ASE)',
      packageLpa: 6.50,
      eligibilityCriteria: 'B.Tech / BCA with CGPA >= 6.5.',
      driveDate: new Date('2026-11-10'),
      deadlineDate: new Date('2026-11-01'),
      location: 'HITM Electronic City Campus',
      jobType: 'Full-time',
      status: 'open',
    },
  });

  // Student Placements Applications
  await prisma.studentPlacement.upsert({
    where: { id: 'fa111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: 'fa111111-1111-1111-1111-111111111111',
      academyId,
      driveId: driveTcsId,
      studentId: student1Id,
      status: 'shortlisted',
      remarks: 'Cleared technical assessment round 1 & 2.',
    },
  });

  // =========================================================================
  // 15. INTERNSHIPS
  // =========================================================================
  console.log('15. Seeding Internships...');
  await prisma.internshipRecord.upsert({
    where: { id: 'fb111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: 'fb111111-1111-1111-1111-111111111111',
      academyId,
      studentId: student1Id,
      companyName: 'TCS Innovation Labs',
      role: 'Software Engineering Intern',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-12-31'),
      stipend: 25000,
      status: 'active',
    },
  });

  await prisma.internshipRecord.upsert({
    where: { id: 'fb222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: 'fb222222-2222-2222-2222-222222222222',
      academyId,
      studentId: student2Id,
      companyName: 'Infosys Springboard',
      role: 'Data Science & Analytics Intern',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-08-31'),
      stipend: 20000,
      status: 'completed',
    },
  });

  // =========================================================================
  // 16. LIBRARY BOOKS
  // =========================================================================
  console.log('16. Seeding Library Books...');
  const booksData = [
    {
      id: 'bc111111-1111-1111-1111-111111111111',
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      isbn: '978-0132350884',
      author: 'Robert C. Martin',
      category: 'Software Engineering',
      publisher: 'Prentice Hall',
      departmentId: cseDeptId,
      totalCopies: 20,
      availableCopies: 18,
      shelfLocation: 'Stack CS-Row 1-A',
    },
    {
      id: 'bc222222-2222-2222-2222-222222222222',
      title: 'Database System Concepts',
      isbn: '978-0078022159',
      author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
      category: 'Database Systems',
      publisher: 'McGraw-Hill',
      departmentId: cseDeptId,
      totalCopies: 30,
      availableCopies: 27,
      shelfLocation: 'Stack CS-Row 2-B',
    },
    {
      id: 'bc333333-3333-3333-3333-333333333333',
      title: 'Operating System Concepts',
      isbn: '978-1119800361',
      author: 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne',
      category: 'Operating Systems',
      publisher: 'Wiley',
      departmentId: cseDeptId,
      totalCopies: 25,
      availableCopies: 22,
      shelfLocation: 'Stack CS-Row 3-C',
    },
    {
      id: 'bc444444-4444-4444-4444-444444444444',
      title: 'Computer Networks',
      isbn: '978-0136894087',
      author: 'Andrew S. Tanenbaum, David J. Wetherall',
      category: 'Computer Networks',
      publisher: 'Pearson',
      departmentId: cseDeptId,
      totalCopies: 25,
      availableCopies: 24,
      shelfLocation: 'Stack CS-Row 4-D',
    },
    {
      id: 'bc555555-5555-5555-5555-555555555555',
      title: 'Introduction to Algorithms',
      isbn: '978-0262046305',
      author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
      category: 'Algorithms',
      publisher: 'MIT Press',
      departmentId: cseDeptId,
      totalCopies: 35,
      availableCopies: 31,
      shelfLocation: 'Stack CS-Row 5-E',
    },
  ];

  for (const bk of booksData) {
    await prisma.libraryBook.upsert({
      where: { id: bk.id },
      update: {
        title: bk.title,
        isbn: bk.isbn,
        author: bk.author,
        category: bk.category,
        totalCopies: bk.totalCopies,
        availableCopies: bk.availableCopies,
      },
      create: {
        id: bk.id,
        academyId,
        title: bk.title,
        isbn: bk.isbn,
        author: bk.author,
        category: bk.category,
        publisher: bk.publisher,
        departmentId: bk.departmentId,
        totalCopies: bk.totalCopies,
        availableCopies: bk.availableCopies,
        shelfLocation: bk.shelfLocation,
        status: 'available',
      },
    });
  }

  // Book issue record
  await prisma.bookIssueRecord.upsert({
    where: { id: 'fc111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: 'fc111111-1111-1111-1111-111111111111',
      academyId,
      bookId: booksData[0].id,
      studentId: student1Id,
      issueDate: new Date('2026-09-01'),
      dueDate: new Date('2026-09-25'),
      status: 'issued',
    },
  });

  // =========================================================================
  // 17. ANNOUNCEMENTS & NOTIFICATIONS
  // =========================================================================
  console.log('17. Seeding Announcements & Notifications...');
  const announcements = [
    {
      id: 'fd111111-1111-1111-1111-111111111111',
      title: 'Semester 3 Internal Examination Schedule Released',
      message: 'Continuous Internal Evaluation (CIE-1) timetable for all Engineering & Degree programs has been published on the student portal.',
      type: 'in_app',
      status: 'sent',
    },
    {
      id: 'fd222222-2222-2222-2222-222222222222',
      title: 'Fee Payment Deadline for Academic Year 2026-27',
      message: 'All students are requested to complete the remaining installment of annual tuition fees on or before October 31, 2026.',
      type: 'in_app',
      status: 'sent',
    },
    {
      id: 'fd333333-3333-3333-3333-333333333333',
      title: 'Campus Placement Drive – TCS & Infosys',
      message: 'TCS and Infosys campus recruitment registration is now active under the Placement Cell portal for all eligible final and pre-final year students.',
      type: 'in_app',
      status: 'sent',
    },
    {
      id: 'fd444444-4444-4444-4444-444444444444',
      title: 'Independence Day Holiday & Flag Hoisting Ceremony',
      message: 'The college campus will host the 80th Independence Day Flag Hoisting Ceremony at 08:30 AM in the Main Campus Quadrangle.',
      type: 'in_app',
      status: 'sent',
    },
  ];

  for (const ann of announcements) {
    await prisma.notification.upsert({
      where: { id: ann.id },
      update: { title: ann.title, message: ann.message },
      create: {
        id: ann.id,
        academyId,
        userId: adminUserId,
        title: ann.title,
        message: ann.message,
        type: ann.type,
        status: ann.status,
      },
    });
  }

  // =========================================================================
  // 18. CMS & TESTIMONIALS & ENQUIRIES (OPTIONAL MODULE)
  // =========================================================================
  console.log('18. Seeding CMS & Enquiries (if tables exist)...');
  try {
    await (prisma as any).testimonial?.upsert({
      where: { id: 'fe111111-1111-1111-1111-111111111111' },
      update: {},
      create: {
        id: 'fe111111-1111-1111-1111-111111111111',
        academyId,
        authorName: 'Arjun Kumar',
        authorRole: 'B.Tech CSE Student (Class of 2029)',
        content: 'The curriculum and practical labs at Hyvora Institute have prepared us directly for high-scale software engineering careers.',
        rating: 5,
        isFeatured: true,
      },
    });

    await (prisma as any).contactEnquiry?.upsert({
      where: { id: 'ff111111-1111-1111-1111-111111111111' },
      update: {},
      create: {
        id: 'ff111111-1111-1111-1111-111111111111',
        academyId,
        name: 'Vikas Deshmukh',
        email: 'vikas.d@gmail.com',
        phone: '+91-9876500112',
        subject: 'Admissions for B.Tech AI & Machine Learning 2026-27',
        message: 'Interested in the lateral entry admission procedure and fee structure for the AIML degree program.',
        status: 'pending',
      },
    });
  } catch (err) {
    console.log('CMS tables not present, skipping optional CMS seeding.');
  }

  console.log('=================================================================');
  console.log('HYVORA EduERP Degree College Database Seeding Finished Successfully!');
  console.log('Admin Account:   admin@hyvora.com (or username: admin) / admin');
  console.log('Faculty Account: anil.kumar@hitm.edu.in / Faculty123!');
  console.log('Faculty Account: priya.sharma@hitm.edu.in / Faculty123!');
  console.log('Student Account: arjun.kumar@hitm.edu.in / Student123!');
  console.log('Student Account: sneha.r@hitm.edu.in / Student123!');
  console.log('Student Account: rahul.sharma@hitm.edu.in / Student123!');
  console.log('=================================================================');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
