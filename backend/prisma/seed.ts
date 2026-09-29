import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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

// Deterministic UUID generator helper for stable references
function generateId(prefix: string, index: string | number): string {
  const hash = crypto.createHash('md5').update(`${prefix}-${index}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function ensureAllTablesExist() {
  console.log('🛠️ Verifying & Creating all necessary tables in topological order...');

  const ddlStatements = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    
    // 1. Academies
    `CREATE TABLE IF NOT EXISTS academies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      subdomain VARCHAR(100) UNIQUE NOT NULL,
      domain VARCHAR(255) UNIQUE,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 2. Users
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      initial_password VARCHAR(255),
      first_name VARCHAR(150) NOT NULL,
      last_name VARCHAR(150) NOT NULL,
      phone VARCHAR(50),
      avatar_id UUID,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      refresh_token TEXT,
      verification_token VARCHAR(255),
      is_email_verified BOOLEAN DEFAULT false NOT NULL,
      is_default_password BOOLEAN DEFAULT true NOT NULL,
      reset_password_token VARCHAR(255),
      reset_password_expires TIMESTAMP WITH TIME ZONE,
      last_login_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_users_academy_email UNIQUE (academy_id, email)
    )`,

    // 3. Roles
    `CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(100) NOT NULL,
      description TEXT,
      is_system BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 4. Permissions
    `CREATE TABLE IF NOT EXISTS permissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) UNIQUE NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      resource VARCHAR(100) NOT NULL,
      action VARCHAR(50) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 5. User Roles
    `CREATE TABLE IF NOT EXISTS user_roles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
    )`,

    // 6. Branches
    `CREATE TABLE IF NOT EXISTS branches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      address TEXT NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(100) NOT NULL,
      pincode VARCHAR(20) DEFAULT '560001' NOT NULL,
      contact_number VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      manager_id UUID,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_branches_name UNIQUE (academy_id, name),
      CONSTRAINT uq_branches_code UNIQUE (academy_id, code)
    )`,

    // 7. Departments
    `CREATE TABLE IF NOT EXISTS departments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      description TEXT,
      hod_id UUID,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_departments_academy_code UNIQUE (academy_id, code)
    )`,

    // 8. Courses
    `CREATE TABLE IF NOT EXISTS courses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      degree_type VARCHAR(100) DEFAULT 'B.Tech',
      duration VARCHAR(100) DEFAULT '4 Years',
      total_semesters INT DEFAULT 8 NOT NULL,
      scheme_year VARCHAR(50) DEFAULT '2026',
      credits_required INT DEFAULT 160,
      description TEXT,
      syllabus_id UUID,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_courses_branch_code UNIQUE (branch_id, code),
      CONSTRAINT uq_courses_branch_name UNIQUE (branch_id, name)
    )`,

    // 9. Subjects
    `CREATE TABLE IF NOT EXISTS subjects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
      semester INT DEFAULT 1 NOT NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      description TEXT,
      subject_type VARCHAR(50) DEFAULT 'theory' NOT NULL,
      credits INT DEFAULT 3 NOT NULL,
      internal_marks NUMERIC(6, 2) DEFAULT 40.00,
      external_marks NUMERIC(6, 2) DEFAULT 60.00,
      total_marks NUMERIC(6, 2) DEFAULT 100.00,
      passing_marks NUMERIC(6, 2) DEFAULT 40.00,
      is_elective BOOLEAN DEFAULT false NOT NULL,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_subjects_course_code UNIQUE (course_id, code),
      CONSTRAINT uq_subjects_course_name UNIQUE (course_id, name)
    )`,

    // 10. Batches
    `CREATE TABLE IF NOT EXISTS batches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(100) NOT NULL,
      academic_year VARCHAR(50) DEFAULT '2026-2030',
      current_semester INT DEFAULT 1 NOT NULL,
      section_name VARCHAR(50) DEFAULT 'A',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      capacity INT,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_batches_branch_code UNIQUE (branch_id, code)
    )`,

    // 11. Teachers
    `CREATE TABLE IF NOT EXISTS teachers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
      department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      employee_number VARCHAR(100) NOT NULL,
      designation VARCHAR(100) DEFAULT 'Assistant Professor',
      qualification VARCHAR(255),
      experience_years INT DEFAULT 3,
      specialization VARCHAR(255),
      joining_date DATE DEFAULT CURRENT_DATE NOT NULL,
      salary_structure JSONB,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_teachers_academy_employee_number UNIQUE (academy_id, employee_number)
    )`,

    // 12. Students
    `CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
      semester INT DEFAULT 1 NOT NULL,
      section VARCHAR(50) DEFAULT 'A',
      admission_year VARCHAR(50) DEFAULT '2026',
      university_reg_number VARCHAR(100),
      admission_number VARCHAR(100) NOT NULL,
      admission_date DATE DEFAULT CURRENT_DATE NOT NULL,
      date_of_birth DATE NOT NULL,
      gender VARCHAR(50),
      blood_group VARCHAR(20),
      parent_name VARCHAR(255) NOT NULL,
      parent_phone VARCHAR(50) NOT NULL,
      parent_email VARCHAR(255),
      father_name VARCHAR(255),
      mother_name VARCHAR(255),
      roll_number VARCHAR(100),
      fee_plan VARCHAR(100),
      student_status VARCHAR(50) DEFAULT 'active' NOT NULL,
      student_photo_id UUID,
      aadhaar_id UUID,
      previous_marks_card_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_students_academy_admission_number UNIQUE (academy_id, admission_number)
    )`,

    // 13. Academy Settings
    `CREATE TABLE IF NOT EXISTS academy_settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID UNIQUE NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      logo_id UUID,
      favicon_id UUID,
      primary_color VARCHAR(50),
      secondary_color VARCHAR(50),
      address TEXT,
      phone VARCHAR(50),
      email VARCHAR(255),
      timezone VARCHAR(100) DEFAULT 'Asia/Kolkata' NOT NULL,
      currency VARCHAR(50) DEFAULT 'INR' NOT NULL,
      theme VARCHAR(50) DEFAULT 'light' NOT NULL,
      academic_year VARCHAR(50) DEFAULT '2026-27',
      current_semester VARCHAR(100) DEFAULT 'Odd Semester (1, 3, 5, 7)',
      institution_type VARCHAR(100) DEFAULT 'Engineering & Degree College',
      smtp_settings JSONB,
      payment_gateway_keys JSONB,
      social_links JSONB,
      seo_settings JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 14. Subscriptions
    `CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      plan_name VARCHAR(100) NOT NULL,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      billing_cycle VARCHAR(50) NOT NULL,
      starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
      trial_ends_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 15. Teacher Subjects
    `CREATE TABLE IF NOT EXISTS teacher_subjects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_teacher_subject_batch UNIQUE (batch_id, subject_id, teacher_id)
    )`,

    // 16. Timetables
    `CREATE TABLE IF NOT EXISTS timetable_schedules (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      day_of_week VARCHAR(50) NOT NULL,
      start_time VARCHAR(50) NOT NULL,
      end_time VARCHAR(50) NOT NULL,
      room_number VARCHAR(100),
      is_lab BOOLEAN DEFAULT false NOT NULL,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 17. Attendance
    `CREATE TABLE IF NOT EXISTS attendance (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      total_students INT DEFAULT 0 NOT NULL,
      present_count INT DEFAULT 0 NOT NULL,
      absent_count INT DEFAULT 0 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_attendance_session UNIQUE (batch_id, subject_id, date)
    )`,

    // 18. Attendance Records
    `CREATE TABLE IF NOT EXISTS attendance_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'present' NOT NULL,
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      CONSTRAINT uq_attendance_record UNIQUE (attendance_id, student_id)
    )`,

    // 19. Teacher Attendance
    `CREATE TABLE IF NOT EXISTS teacher_attendance (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'present' NOT NULL,
      remarks VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_teacher_attendance UNIQUE (teacher_id, date)
    )`,

    // 20. Teacher Leaves
    `CREATE TABLE IF NOT EXISTS teacher_leaves (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      leave_type VARCHAR(100) NOT NULL,
      starts_at DATE NOT NULL,
      ends_at DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'pending' NOT NULL,
      reason TEXT,
      approved_by_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 21. Fee Structures
    `CREATE TABLE IF NOT EXISTS fee_structures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      amount NUMERIC(12, 2) NOT NULL,
      frequency VARCHAR(50) DEFAULT 'semester' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 22. Fee Allocations
    `CREATE TABLE IF NOT EXISTS fee_allocations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      due_date DATE NOT NULL,
      status VARCHAR(50) DEFAULT 'unpaid' NOT NULL,
      total_amount NUMERIC(12, 2) NOT NULL,
      paid_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      discount_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 23. Payment Transactions
    `CREATE TABLE IF NOT EXISTS payment_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      fee_allocation_id UUID NOT NULL REFERENCES fee_allocations(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
      payment_method VARCHAR(100),
      gateway_provider VARCHAR(100),
      gateway_order_id VARCHAR(255),
      gateway_transaction_ref VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending' NOT NULL,
      failure_reason TEXT,
      gateway_response JSONB DEFAULT '{}'::jsonb NOT NULL,
      retry_count INT DEFAULT 0 NOT NULL,
      ip_address VARCHAR(45),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 24. Payments
    `CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      fee_allocation_id UUID NOT NULL REFERENCES fee_allocations(id) ON DELETE CASCADE,
      payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
      amount_paid NUMERIC(12, 2) NOT NULL,
      payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      receipt_number VARCHAR(100) NOT NULL,
      payment_mode VARCHAR(100) NOT NULL,
      reference_no VARCHAR(255),
      remarks TEXT,
      recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_payments_receipt_number UNIQUE (academy_id, receipt_number)
    )`,

    // 25. Study Materials
    `CREATE TABLE IF NOT EXISTS study_materials (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
      teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
      media_file_id UUID,
      material_type VARCHAR(50) DEFAULT 'pdf' NOT NULL,
      url VARCHAR(1024),
      access_level VARCHAR(50) DEFAULT 'batch_only' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 26. Study Material Batches
    `CREATE TABLE IF NOT EXISTS study_material_batches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      study_material_id UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
      batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_study_material_batch UNIQUE (study_material_id, batch_id)
    )`,

    // 27. Video Lectures
    `CREATE TABLE IF NOT EXISTS video_lectures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
      teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
      media_file_id UUID,
      external_video_url VARCHAR(512),
      video_provider VARCHAR(50) DEFAULT 'youtube' NOT NULL,
      thumbnail_id UUID,
      duration_seconds INT,
      access_level VARCHAR(50) DEFAULT 'batch_only' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 28. Video Lecture Batches
    `CREATE TABLE IF NOT EXISTS video_lecture_batches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      video_lecture_id UUID NOT NULL REFERENCES video_lectures(id) ON DELETE CASCADE,
      batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_video_lecture_batch UNIQUE (video_lecture_id, batch_id)
    )`,

    // 29. Assignments
    `CREATE TABLE IF NOT EXISTS assignments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      max_marks NUMERIC(6, 2) NOT NULL,
      due_date TIMESTAMP WITH TIME ZONE NOT NULL,
      media_file_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 30. Assignment Submissions
    `CREATE TABLE IF NOT EXISTS assignment_submissions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      media_file_id UUID,
      student_remarks TEXT,
      status VARCHAR(50) DEFAULT 'submitted' NOT NULL,
      marks_obtained NUMERIC(6, 2),
      teacher_remarks TEXT,
      graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      graded_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_assignment_submission UNIQUE (assignment_id, student_id)
    )`,

    // 31. Exams
    `CREATE TABLE IF NOT EXISTS exams (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      exam_type VARCHAR(100) DEFAULT 'Semester End Exam' NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 32. Exam Papers
    `CREATE TABLE IF NOT EXISTS exam_papers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
      exam_date DATE NOT NULL,
      start_time VARCHAR(50) NOT NULL,
      duration_minutes INT NOT NULL,
      max_marks NUMERIC(6, 2) NOT NULL,
      passing_marks NUMERIC(6, 2) NOT NULL,
      question_paper_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 33. Exam Results
    `CREATE TABLE IF NOT EXISTS exam_results (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      exam_paper_id UUID NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      marks_obtained NUMERIC(6, 2),
      remarks TEXT,
      status VARCHAR(50) DEFAULT 'pass' NOT NULL,
      graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_exam_result UNIQUE (exam_paper_id, student_id)
    )`,

    // 34. Student Semester Grades
    `CREATE TABLE IF NOT EXISTS student_semester_grades (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      semester INT NOT NULL,
      academic_year VARCHAR(50) NOT NULL,
      sgpa NUMERIC(4, 2),
      cgpa NUMERIC(4, 2),
      total_credits_earned INT,
      backlogs_count INT DEFAULT 0 NOT NULL,
      status VARCHAR(50) DEFAULT 'passed' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_student_semester_grade UNIQUE (student_id, semester)
    )`,

    // 35. Grading Schemes
    `CREATE TABLE IF NOT EXISTS grading_schemes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      name VARCHAR(255) DEFAULT 'Standard 10-Point UGC / VTU Scheme' NOT NULL,
      grade_scale JSONB DEFAULT '[]'::jsonb NOT NULL,
      is_default BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 36. Placement Drives
    `CREATE TABLE IF NOT EXISTS placement_drives (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      company_name VARCHAR(255) NOT NULL,
      job_role VARCHAR(255) NOT NULL,
      package_lpa NUMERIC(6, 2) NOT NULL,
      eligibility_criteria TEXT,
      drive_date DATE,
      deadline_date DATE,
      location VARCHAR(255),
      job_type VARCHAR(100) DEFAULT 'Full-time' NOT NULL,
      status VARCHAR(50) DEFAULT 'open' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 37. Student Placements
    `CREATE TABLE IF NOT EXISTS student_placements (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      drive_id UUID NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'applied' NOT NULL,
      remarks TEXT,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_student_placement UNIQUE (drive_id, student_id)
    )`,

    // 38. Internship Records
    `CREATE TABLE IF NOT EXISTS internship_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
      company_name VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL,
      stipend NUMERIC(10, 2),
      start_date DATE NOT NULL,
      end_date DATE,
      status VARCHAR(50) DEFAULT 'active' NOT NULL,
      certificate_url VARCHAR(1024),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 39. Library Books
    `CREATE TABLE IF NOT EXISTS library_books (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
      title VARCHAR(255) NOT NULL,
      isbn VARCHAR(100),
      author VARCHAR(255) NOT NULL,
      category VARCHAR(100),
      publisher VARCHAR(255),
      total_copies INT DEFAULT 1 NOT NULL,
      available_copies INT DEFAULT 1 NOT NULL,
      shelf_location VARCHAR(100),
      status VARCHAR(50) DEFAULT 'available' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 40. Book Issue Records
    `CREATE TABLE IF NOT EXISTS book_issue_records (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      issue_date DATE DEFAULT CURRENT_DATE NOT NULL,
      due_date DATE NOT NULL,
      return_date DATE,
      fine_amount NUMERIC(8, 2) DEFAULT 0.00 NOT NULL,
      status VARCHAR(50) DEFAULT 'issued' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 41. Notifications
    `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'in_app' NOT NULL,
      status VARCHAR(50) DEFAULT 'sent' NOT NULL,
      read_at TIMESTAMP WITH TIME ZONE,
      failure_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 42. Notification Templates
    `CREATE TABLE IF NOT EXISTS notification_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      subject VARCHAR(255),
      body TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'email' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_template_name_type UNIQUE (academy_id, name, type)
    )`,

    // 43. Website Pages
    `CREATE TABLE IF NOT EXISTS website_pages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      content JSONB DEFAULT '{}'::jsonb NOT NULL,
      status VARCHAR(50) DEFAULT 'draft' NOT NULL,
      meta_title VARCHAR(255),
      meta_description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_website_page_slug UNIQUE (academy_id, slug)
    )`,

    // 44. Gallery Albums & Images
    `CREATE TABLE IF NOT EXISTS gallery_albums (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      cover_image_id UUID,
      is_public BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 45. Testimonials
    `CREATE TABLE IF NOT EXISTS testimonials (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      author_name VARCHAR(255) NOT NULL,
      author_role VARCHAR(150) NOT NULL,
      content TEXT NOT NULL,
      avatar_id UUID,
      rating INT,
      is_featured BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 46. Contact Enquiries
    `CREATE TABLE IF NOT EXISTS contact_enquiries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      subject VARCHAR(255),
      message TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending' NOT NULL,
      response_notes TEXT,
      resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 47. Admission Enquiries
    `CREATE TABLE IF NOT EXISTS admission_enquiries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      student_first_name VARCHAR(150) NOT NULL,
      student_last_name VARCHAR(150) NOT NULL,
      date_of_birth DATE NOT NULL,
      course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
      parent_name VARCHAR(255) NOT NULL,
      parent_phone VARCHAR(50) NOT NULL,
      parent_email VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending' NOT NULL,
      remarks TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    )`,

    // 48. Dashboard Cache
    `CREATE TABLE IF NOT EXISTS dashboard_cache (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
      metric_key VARCHAR(100) NOT NULL,
      metric_value NUMERIC(16, 4) NOT NULL,
      dimension VARCHAR(100),
      dimension_id UUID,
      raw_data JSONB DEFAULT '{}'::jsonb NOT NULL,
      cached_until TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT uq_academy_metric_dimension UNIQUE (academy_id, metric_key, dimension, dimension_id)
    )`,

    // 49. Login Activities
    `CREATE TABLE IF NOT EXISTS login_activities (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      attempted_email VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      ip_address VARCHAR(45),
      user_agent VARCHAR(512),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    )`,

    // Column updates for legacy compatibility
    `ALTER TABLE IF EXISTS study_materials ADD COLUMN IF NOT EXISTS material_type VARCHAR(50) DEFAULT 'pdf'`,
    `ALTER TABLE IF EXISTS study_materials ADD COLUMN IF NOT EXISTS url VARCHAR(1024)`,
    `ALTER TABLE IF EXISTS study_materials ALTER COLUMN media_file_id DROP NOT NULL`,
    `ALTER TABLE IF EXISTS assignment_submissions ALTER COLUMN media_file_id DROP NOT NULL`,
    `ALTER TABLE IF EXISTS assignment_submissions ALTER COLUMN submission_date SET DEFAULT NOW()`,
    `ALTER TABLE IF EXISTS role_permissions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE`,
  ];

  for (const sql of ddlStatements) {
    try {
      await pool.query(sql);
    } catch (e: any) {
      console.warn(`DDL Notice for query: ${sql.slice(0, 40)}... -> ${e.message}`);
    }
  }

  console.log('✅ All database tables verified and ready.');
}

async function main() {
  console.log('🚀 Starting Comprehensive HYVORA EduERP Degree College Database Seeding...');

  await ensureAllTablesExist();

  const academyId = 'a1111111-1111-1111-1111-111111111111';
  const roleSuperAdminId = 'e1111111-1111-1111-1111-111111111111';
  const roleAdminId = 'e2222222-2222-2222-2222-222222222222';
  const roleFacultyId = 'e3333333-3333-3333-3333-333333333333';
  const roleStudentId = 'e4444444-4444-4444-4444-444444444444';

  // Safe table cleanup
  console.log('🧹 Cleaning previous seed records for clean fresh dataset...');
  const cleanups = [
    () => prisma.loginActivity.deleteMany({}),
    () => prisma.studentPlacement.deleteMany({ where: { academyId } }),
    () => prisma.internshipRecord.deleteMany({ where: { academyId } }),
    () => prisma.bookIssueRecord.deleteMany({ where: { academyId } }),
    () => prisma.libraryBook.deleteMany({ where: { academyId } }),
    () => prisma.payment.deleteMany({ where: { feeAllocation: { academyId } } }),
    () => prisma.paymentTransaction.deleteMany({ where: { feeAllocation: { academyId } } }),
    () => prisma.feeAllocation.deleteMany({ where: { academyId } }),
    () => prisma.feeStructure.deleteMany({ where: { academyId } }),
    () => prisma.assignmentSubmission.deleteMany({ where: { academyId } }),
    () => prisma.assignment.deleteMany({ where: { academyId } }),
    () => prisma.studyMaterialBatch.deleteMany({ where: { academyId } }),
    () => prisma.studyMaterial.deleteMany({ where: { academyId } }),
    () => prisma.videoLectureBatch.deleteMany({ where: { academyId } }),
    () => prisma.videoLecture.deleteMany({ where: { academyId } }),
    () => prisma.examResult.deleteMany({ where: { examPaper: { academyId } } }),
    () => prisma.examPaper.deleteMany({ where: { academyId } }),
    () => prisma.exam.deleteMany({ where: { academyId } }),
    () => prisma.studentSemesterGrade.deleteMany({ where: { academyId } }),
    () => prisma.attendanceRecord.deleteMany({ where: { attendance: { academyId } } }),
    () => prisma.attendance.deleteMany({ where: { academyId } }),
    () => prisma.teacherAttendance.deleteMany({ where: { academyId } }),
    () => prisma.teacherLeave.deleteMany({ where: { academyId } }),
    () => prisma.timetableSchedule.deleteMany({ where: { academyId } }),
    () => prisma.teacherSubject.deleteMany({ where: { academyId } }),
    () => prisma.placementDrive.deleteMany({ where: { academyId } }),
    () => prisma.notification.deleteMany({ where: { academyId } }),
    () => prisma.notificationTemplate.deleteMany({ where: { academyId } }),
    () => prisma.testimonial.deleteMany({ where: { academyId } }),
    () => prisma.contactEnquiry.deleteMany({ where: { academyId } }),
    () => prisma.admissionEnquiry.deleteMany({ where: { academyId } }),
    () => prisma.galleryAlbum.deleteMany({ where: { academyId } }),
    () => prisma.websitePage.deleteMany({ where: { academyId } }),
    () => prisma.student.deleteMany({ where: { academyId } }),
    () => prisma.department.updateMany({ where: { academyId }, data: { hodId: null } }),
    () => prisma.teacher.deleteMany({ where: { academyId } }),
    () => prisma.userRole.deleteMany({ where: { academyId } }),
    () => prisma.user.deleteMany({ where: { academyId } }),
    () => prisma.batch.deleteMany({ where: { academyId } }),
    () => prisma.subject.deleteMany({ where: { academyId } }),
    () => prisma.course.deleteMany({ where: { academyId } }),
    () => prisma.department.deleteMany({ where: { academyId } }),
    () => prisma.branch.deleteMany({ where: { academyId } }),
  ];

  for (const cleanupFn of cleanups) {
    try {
      await cleanupFn();
    } catch (cErr) {
      // Table may be empty or newly created
    }
  }

  // =========================================================================
  // 1. INSTITUTION SETUP & ACADEMY SETTINGS
  // =========================================================================
  console.log('🏛️ 1. Setting up Academy & Institutional Settings...');
  await prisma.academy.upsert({
    where: { id: academyId },
    update: {
      name: 'Hyvora Institute of Technology & Management (Autonomous)',
      subdomain: 'hyvora',
      domain: 'hitm.edu.in',
      status: 'active',
    },
    create: {
      id: academyId,
      name: 'Hyvora Institute of Technology & Management (Autonomous)',
      subdomain: 'hyvora',
      domain: 'hitm.edu.in',
      status: 'active',
    },
  });

  await prisma.academySetting.upsert({
    where: { academyId },
    update: {
      primaryColor: '#2563eb',
      secondaryColor: '#0ea5e9',
      address: 'Knowledge City, Campus Boulevard, Electronic City Phase 1, Bangalore, Karnataka 560100',
      phone: '+91-80-28520000',
      email: 'admissions@hitm.edu.in',
      academicYear: '2026-27',
      currentSemester: 'Odd Semester (Sem 1, 3, 5, 7)',
      institutionType: 'Engineering & Degree College',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      theme: 'light',
      socialLinks: {
        website: 'https://degree.hyvora.in',
        linkedin: 'https://linkedin.com/school/hyvora-degree',
        twitter: 'https://x.com/hyvora_edu',
        youtube: 'https://youtube.com/@hyvora_degree',
      },
      seoSettings: {
        metaTitle: 'Hyvora Institute of Technology & Management | Autonomous Degree College',
        metaDescription: 'Premier autonomous institution offering B.Tech, M.Tech, BBA, MBA, BCA, MCA programs with industry-aligned curriculum and 100% placement track record.',
      },
    },
    create: {
      id: 'a2222222-2222-2222-2222-222222222222',
      academyId,
      primaryColor: '#2563eb',
      secondaryColor: '#0ea5e9',
      address: 'Knowledge City, Campus Boulevard, Electronic City Phase 1, Bangalore, Karnataka 560100',
      phone: '+91-80-28520000',
      email: 'admissions@hitm.edu.in',
      academicYear: '2026-27',
      currentSemester: 'Odd Semester (Sem 1, 3, 5, 7)',
      institutionType: 'Engineering & Degree College',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      theme: 'light',
      socialLinks: {
        website: 'https://degree.hyvora.in',
        linkedin: 'https://linkedin.com/school/hyvora-degree',
        twitter: 'https://x.com/hyvora_edu',
        youtube: 'https://youtube.com/@hyvora_degree',
      },
      seoSettings: {
        metaTitle: 'Hyvora Institute of Technology & Management | Autonomous Degree College',
        metaDescription: 'Premier autonomous institution offering B.Tech, M.Tech, BBA, MBA, BCA, MCA programs with industry-aligned curriculum and 100% placement track record.',
      },
    },
  });

  // Enterprise Subscription
  await prisma.subscription.upsert({
    where: { id: 'cd588752-afde-a28a-07c9-72e5e2c8e3fc' },
    update: { status: 'active' },
    create: {
      id: 'cd588752-afde-a28a-07c9-72e5e2c8e3fc',
      academyId,
      planName: 'Enterprise Degree ERP Platinum',
      status: 'active',
      price: 250000.00,
      billingCycle: 'annual',
      startsAt: new Date('2026-01-01'),
      endsAt: new Date('2030-12-31'),
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
  // 2. CAMPUSES / BRANCHES (3 Fully Configured Campuses)
  // =========================================================================
  console.log('🏢 2. Seeding 3 Campuses (Main Campus, Electronic City, Whitefield)...');
  const mainCampusId = 'b1111111-1111-1111-1111-111111111111';
  const ecCampusId = 'b2222222-2222-2222-2222-222222222222';
  const wfCampusId = 'b3333333-3333-3333-3333-333333333333';

  const branchesData = [
    {
      id: mainCampusId,
      name: 'Main Campus (Central)',
      code: 'MAIN-CAMPUS',
      address: 'University Road, Knowledge City, Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      contactNumber: '+91-80-28520001',
      email: 'main-campus@hitm.edu.in',
    },
    {
      id: ecCampusId,
      name: 'Electronic City Tech Campus',
      code: 'EC-CAMPUS',
      address: 'Electronic City Phase 1, Hosur Main Road, Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560100',
      contactNumber: '+91-80-28520002',
      email: 'ec-campus@hitm.edu.in',
    },
    {
      id: wfCampusId,
      name: 'Whitefield Innovation Campus',
      code: 'WF-CAMPUS',
      address: 'ITPB Main Road, Whitefield Tech Corridor, Bangalore, Karnataka',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066',
      contactNumber: '+91-80-28520003',
      email: 'whitefield-campus@hitm.edu.in',
    },
  ];

  for (const b of branchesData) {
    await prisma.branch.upsert({
      where: { id: b.id },
      update: {
        name: b.name,
        code: b.code,
        address: b.address,
        city: b.city,
        state: b.state,
        pincode: b.pincode,
        contactNumber: b.contactNumber,
        email: b.email,
        status: 'active',
      },
      create: {
        id: b.id,
        academyId,
        name: b.name,
        code: b.code,
        address: b.address,
        city: b.city,
        state: b.state,
        pincode: b.pincode,
        contactNumber: b.contactNumber,
        email: b.email,
        status: 'active',
      },
    });
  }

  // =========================================================================
  // 3. CORE ADMIN & PRINCIPAL USERS
  // =========================================================================
  console.log('👤 3. Seeding Admin & Principal Accounts...');
  const defaultPassword = await bcrypt.hash('admin', 10);
  const adminUserId = '11111111-1111-1111-1111-111111111111';
  const deanUserId = '12222222-2222-2222-2222-222222222222';

  await prisma.user.upsert({
    where: { id: adminUserId },
    update: {
      email: 'admin@hyvora.com',
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
      passwordHash: defaultPassword,
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

  await prisma.user.upsert({
    where: { id: deanUserId },
    update: {
      email: 'dean.academics@hitm.edu.in',
      firstName: 'Dr. Meenakshi',
      lastName: 'Sundaram',
      phone: '+91-9876543211',
      status: 'active',
      isEmailVerified: true,
      isDefaultPassword: false,
    },
    create: {
      id: deanUserId,
      academyId,
      email: 'dean.academics@hitm.edu.in',
      passwordHash: defaultPassword,
      initialPassword: 'admin',
      firstName: 'Dr. Meenakshi',
      lastName: 'Sundaram',
      phone: '+91-9876543211',
      status: 'active',
      isEmailVerified: true,
      isDefaultPassword: false,
    },
  });

  await prisma.userRole.upsert({
    where: { uq_user_role: { userId: deanUserId, roleId: roleAdminId } },
    update: {},
    create: { academyId, userId: deanUserId, roleId: roleAdminId },
  });

  // =========================================================================
  // 4. DEPARTMENTS (Across All Engineering & Management Disciplines)
  // =========================================================================
  console.log('📚 4. Seeding Departments across campuses...');
  const cseDeptId = 'd1111111-1111-1111-1111-111111111111';
  const iseDeptId = 'd2222222-2222-2222-2222-222222222222';
  const eceDeptId = 'd3333333-3333-3333-3333-333333333333';
  const aimlDeptId = 'd4444444-4444-4444-4444-444444444444';
  const bbaDeptId = 'd5555555-5555-5555-5555-555555555555';
  const bcaDeptId = 'd6666666-6666-6666-6666-666666666666';
  const mechDeptId = 'd7777777-7777-7777-7777-777777777777';
  const mbaDeptId = 'd8888888-8888-8888-8888-888888888888';

  const departmentsData = [
    { id: cseDeptId, name: 'Computer Science & Engineering', code: 'CSE', description: 'Department of Computer Science, Cloud Systems & Software Architecture', branchId: mainCampusId },
    { id: iseDeptId, name: 'Information Science & Engineering', code: 'ISE', description: 'Department of Information Systems, Distributed Networks & Data Systems', branchId: mainCampusId },
    { id: eceDeptId, name: 'Electronics & Communication Engineering', code: 'ECE', description: 'Department of VLSI, Embedded Systems, Signal Processing & IoT', branchId: mainCampusId },
    { id: aimlDeptId, name: 'Artificial Intelligence & Machine Learning', code: 'AIML', description: 'Department of Generative AI, Deep Learning, NLP & Autonomous Robotics', branchId: ecCampusId },
    { id: bbaDeptId, name: 'School of Business Administration', code: 'BBA', description: 'Department of Management Studies, FinTech, Marketing & Leadership', branchId: mainCampusId },
    { id: bcaDeptId, name: 'Department of Computer Applications', code: 'BCA', description: 'Department of Applied Software Development, Web Tech & Database Systems', branchId: ecCampusId },
    { id: mechDeptId, name: 'Mechanical & Mechatronics Engineering', code: 'MECH', description: 'Department of Robotics, CAD/CAM, Thermal Systems & Smart Manufacturing', branchId: mainCampusId },
    { id: mbaDeptId, name: 'Graduate School of Business (MBA)', code: 'MBA', description: 'Postgraduate Management, Strategic Finance, Analytics & Consulting', branchId: wfCampusId },
  ];

  for (const dept of departmentsData) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: { name: dept.name, code: dept.code, description: dept.description, branchId: dept.branchId },
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
  // 5. DEGREE PROGRAMS / COURSES (Across All Branches)
  // =========================================================================
  console.log('🎓 5. Seeding Degree Programs across all 3 campuses...');
  // Main Campus Courses
  const cMainCseId = 'c1111111-1111-1111-1111-111111111111';
  const cMainIseId = 'c2222222-2222-2222-2222-222222222222';
  const cMainEceId = 'c3333333-3333-3333-3333-333333333333';
  const cMainAimlId = 'c4444444-4444-4444-4444-444444444444';
  const cMainBbaId = 'c5555555-5555-5555-5555-555555555555';
  const cMainBcaId = 'c6666666-6666-6666-6666-666666666666';
  const cMainMechId = 'c7777777-7777-7777-7777-777777777777';

  // EC Campus Courses
  const cEcCseId = 'c8888888-8888-8888-8888-888888888888';
  const cEcAimlId = 'c9999999-9999-9999-9999-999999999999';
  const cEcEceId = 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const cEcBcaId = 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  // Whitefield Campus Courses
  const cWfCseId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const cWfMbaId = 'cddddddd-dddd-dddd-dddd-dddddddddddd';
  const cWfAimlId = 'ceeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  const coursesData = [
    // Main Campus
    { id: cMainCseId, branchId: mainCampusId, departmentId: cseDeptId, name: 'B.Tech Computer Science & Engineering', code: 'BTECH-CSE', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Flagship undergraduate program in core computing, systems, algorithms, distributed computing and scalable software architecture.' },
    { id: cMainIseId, branchId: mainCampusId, departmentId: iseDeptId, name: 'B.Tech Information Science & Engineering', code: 'BTECH-ISE', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Engineering program focused on information architecture, enterprise data systems, cloud computing and cyber systems.' },
    { id: cMainEceId, branchId: mainCampusId, departmentId: eceDeptId, name: 'B.Tech Electronics & Communication', code: 'BTECH-ECE', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Undergraduate engineering in digital signal processing, VLSI design, semiconductor devices, embedded systems and 5G/6G communication.' },
    { id: cMainAimlId, branchId: mainCampusId, departmentId: aimlDeptId, name: 'B.Tech Artificial Intelligence & Machine Learning', code: 'BTECH-AIML', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Advanced AI degree covering deep neural networks, computer vision, natural language processing and reinforcement learning.' },
    { id: cMainBbaId, branchId: mainCampusId, departmentId: bbaDeptId, name: 'Bachelor of Business Administration (BBA)', code: 'BBA-HONORS', degreeType: 'BBA', duration: '3 Years', totalSemesters: 6, schemeYear: '2026', creditsRequired: 120, description: 'Undergraduate business administration program with honors specialization in FinTech, Strategic Marketing and Business Analytics.' },
    { id: cMainBcaId, branchId: mainCampusId, departmentId: bcaDeptId, name: 'Bachelor of Computer Applications (BCA)', code: 'BCA-PRO', degreeType: 'BCA', duration: '3 Years', totalSemesters: 6, schemeYear: '2026', creditsRequired: 120, description: 'Professional degree in applied software engineering, modern web full-stack, mobile app development and cloud database administration.' },
    { id: cMainMechId, branchId: mainCampusId, departmentId: mechDeptId, name: 'B.Tech Mechanical & Mechatronics', code: 'BTECH-MECH', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Interdisciplinary program in smart manufacturing, robotics automation, thermal engineering and electric vehicle systems.' },

    // Electronic City Campus
    { id: cEcCseId, branchId: ecCampusId, departmentId: cseDeptId, name: 'B.Tech CSE (Cloud & DevOps Specialization)', code: 'EC-BTECH-CSE', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Industry-partnered CSE curriculum with AWS/GCP cloud engineering and microservices specialization.' },
    { id: cEcAimlId, branchId: ecCampusId, departmentId: aimlDeptId, name: 'B.Tech Data Science & Machine Learning', code: 'EC-BTECH-DS', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Specialized program in big data analytics, statistical modeling, MLOps, and artificial intelligence.' },
    { id: cEcEceId, branchId: ecCampusId, departmentId: eceDeptId, name: 'B.Tech Electronics & IoT Systems', code: 'EC-BTECH-IOT', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Focus on smart sensors, embedded Linux, semiconductor hardware and Industrial IoT.' },
    { id: cEcBcaId, branchId: ecCampusId, departmentId: bcaDeptId, name: 'BCA in Cloud & Cybersecurity', code: 'EC-BCA-SEC', degreeType: 'BCA', duration: '3 Years', totalSemesters: 6, schemeYear: '2026', creditsRequired: 120, description: 'Applied computing degree with network defense, ethical hacking and cloud architecture tracks.' },

    // Whitefield Campus
    { id: cWfCseId, branchId: wfCampusId, departmentId: cseDeptId, name: 'B.Tech Software Product Engineering', code: 'WF-BTECH-SPE', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Modern product engineering curriculum with agile sprints, systems design, and enterprise application engineering.' },
    { id: cWfAimlId, branchId: wfCampusId, departmentId: aimlDeptId, name: 'B.Tech AI & Autonomous Systems', code: 'WF-BTECH-AI', degreeType: 'B.Tech', duration: '4 Years', totalSemesters: 8, schemeYear: '2026', creditsRequired: 160, description: 'Cutting-edge program covering robotics, autonomous navigation, edge AI, and computer vision systems.' },
    { id: cWfMbaId, branchId: wfCampusId, departmentId: mbaDeptId, name: 'Master of Business Administration (MBA Executive)', code: 'WF-MBA-EXEC', degreeType: 'MBA', duration: '2 Years', totalSemesters: 4, schemeYear: '2026', creditsRequired: 90, description: 'Postgraduate MBA degree with dual specialization in Tech Management, Digital Transformation and Finance.' },
  ];

  for (const c of coursesData) {
    await prisma.course.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        code: c.code,
        branchId: c.branchId,
        departmentId: c.departmentId,
        degreeType: c.degreeType,
        duration: c.duration,
        totalSemesters: c.totalSemesters,
        schemeYear: c.schemeYear,
        creditsRequired: c.creditsRequired,
        description: c.description,
        status: 'active',
      },
      create: {
        id: c.id,
        academyId,
        branchId: c.branchId,
        departmentId: c.departmentId,
        name: c.name,
        code: c.code,
        degreeType: c.degreeType,
        duration: c.duration,
        totalSemesters: c.totalSemesters,
        schemeYear: c.schemeYear,
        creditsRequired: c.creditsRequired,
        description: c.description,
        status: 'active',
      },
    });
  }

  // =========================================================================
  // 6. BATCHES & SECTIONS (Active Batches across All Courses & Campuses)
  // =========================================================================
  console.log('👥 6. Seeding Batches for all courses across campuses...');
  const batchesData = [
    // Main Campus Batches
    { id: 'ba111111-1111-1111-1111-111111111111', branchId: mainCampusId, courseId: cMainCseId, departmentId: cseDeptId, name: '2025-2029 B.Tech CSE - Sec A (Sem 3)', code: 'MAIN-CSE-3A', currentSemester: 3, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2025-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },
    { id: 'ba222222-2222-2222-2222-222222222222', branchId: mainCampusId, courseId: cMainCseId, departmentId: cseDeptId, name: '2026-2030 B.Tech CSE - Sec A (Sem 1)', code: 'MAIN-CSE-1A', currentSemester: 1, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2026-08-01'), endDate: new Date('2030-06-30'), capacity: 60 },
    { id: 'ba333333-3333-3333-3333-333333333333', branchId: mainCampusId, courseId: cMainIseId, departmentId: iseDeptId, name: '2025-2029 B.Tech ISE - Sec A (Sem 3)', code: 'MAIN-ISE-3A', currentSemester: 3, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2025-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },
    { id: 'ba444444-4444-4444-4444-444444444444', branchId: mainCampusId, courseId: cMainEceId, departmentId: eceDeptId, name: '2025-2029 B.Tech ECE - Sec A (Sem 3)', code: 'MAIN-ECE-3A', currentSemester: 3, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2025-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },
    { id: 'ba555555-5555-5555-5555-555555555555', branchId: mainCampusId, courseId: cMainAimlId, departmentId: aimlDeptId, name: '2025-2029 B.Tech AIML - Sec A (Sem 3)', code: 'MAIN-AIML-3A', currentSemester: 3, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2025-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },
    { id: 'ba666666-6666-6666-6666-666666666666', branchId: mainCampusId, courseId: cMainBbaId, departmentId: bbaDeptId, name: '2026-2029 BBA Honors - Sec A (Sem 1)', code: 'MAIN-BBA-1A', currentSemester: 1, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2026-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },
    { id: 'ba777777-7777-7777-7777-777777777777', branchId: mainCampusId, courseId: cMainBcaId, departmentId: bcaDeptId, name: '2025-2028 BCA Pro - Sec A (Sem 3)', code: 'MAIN-BCA-3A', currentSemester: 3, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2025-08-01'), endDate: new Date('2028-06-30'), capacity: 60 },
    { id: 'ba888888-8888-8888-8888-888888888888', branchId: mainCampusId, courseId: cMainMechId, departmentId: mechDeptId, name: '2025-2029 B.Tech Mech - Sec A (Sem 3)', code: 'MAIN-MECH-3A', currentSemester: 3, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2025-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },

    // Electronic City Campus Batches
    { id: 'ba999999-9999-9999-9999-999999999999', branchId: ecCampusId, courseId: cEcCseId, departmentId: cseDeptId, name: '2025-2029 EC-CSE Cloud - Sec A (Sem 3)', code: 'EC-CSE-3A', currentSemester: 3, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2025-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },
    { id: 'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', branchId: ecCampusId, courseId: cEcAimlId, departmentId: aimlDeptId, name: '2025-2029 EC-Data Science - Sec A (Sem 3)', code: 'EC-DS-3A', currentSemester: 3, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2025-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },
    { id: 'babbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', branchId: ecCampusId, courseId: cEcEceId, departmentId: eceDeptId, name: '2026-2030 EC-IoT Systems - Sec A (Sem 1)', code: 'EC-IOT-1A', currentSemester: 1, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2026-08-01'), endDate: new Date('2030-06-30'), capacity: 60 },
    { id: 'bacccccc-cccc-cccc-cccc-cccccccccccc', branchId: ecCampusId, courseId: cEcBcaId, departmentId: bcaDeptId, name: '2026-2029 EC-BCA Security - Sec A (Sem 1)', code: 'EC-BCA-1A', currentSemester: 1, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2026-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },

    // Whitefield Campus Batches
    { id: 'badddddd-dddd-dddd-dddd-dddddddddddd', branchId: wfCampusId, courseId: cWfCseId, departmentId: cseDeptId, name: '2025-2029 WF-Product Eng - Sec A (Sem 3)', code: 'WF-SPE-3A', currentSemester: 3, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2025-08-01'), endDate: new Date('2029-06-30'), capacity: 60 },
    { id: 'baeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', branchId: wfCampusId, courseId: cWfAimlId, departmentId: aimlDeptId, name: '2026-2030 WF-AI Robotics - Sec A (Sem 1)', code: 'WF-AI-1A', currentSemester: 1, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2026-08-01'), endDate: new Date('2030-06-30'), capacity: 60 },
    { id: 'baffffff-ffff-ffff-ffff-ffffffffffff', branchId: wfCampusId, courseId: cWfMbaId, departmentId: mbaDeptId, name: '2026-2028 WF-MBA Exec - Sec A (Sem 1)', code: 'WF-MBA-1A', currentSemester: 1, sectionName: 'A', academicYear: '2026-27', startDate: new Date('2026-08-01'), endDate: new Date('2028-06-30'), capacity: 60 },
  ];

  for (const b of batchesData) {
    await prisma.batch.upsert({
      where: { id: b.id },
      update: {
        name: b.name,
        code: b.code,
        branchId: b.branchId,
        courseId: b.courseId,
        departmentId: b.departmentId,
        academicYear: b.academicYear,
        currentSemester: b.currentSemester,
        sectionName: b.sectionName,
        capacity: b.capacity,
        startDate: b.startDate,
        endDate: b.endDate,
        status: 'active',
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
  // 7. FACULTY & TEACHERS (12+ Professors & Subject Leads)
  // =========================================================================
  console.log('👨‍🏫 7. Seeding Faculty Profiles & HODs...');
  const facultyList = [
    {
      userId: '21111111-1111-1111-1111-111111111111',
      teacherId: 'fc111111-1111-1111-1111-111111111111',
      email: 'anil.kumar@hitm.edu.in',
      firstName: 'Dr. Anil',
      lastName: 'Kumar',
      phone: '+91-9845012345',
      employeeNumber: 'FAC-CSE-001',
      departmentId: cseDeptId,
      branchId: mainCampusId,
      designation: 'Professor & HOD',
      qualification: 'Ph.D. Computer Science (IISc), M.Tech (IIT Bombay)',
      experienceYears: 18,
      specialization: 'Distributed Computing, Advanced Data Structures & Cloud Systems',
      isHod: true,
    },
    {
      userId: '22222222-2222-2222-2222-222222222222',
      teacherId: 'fc222222-2222-2222-2222-222222222222',
      email: 'sneha.nambiar@hitm.edu.in',
      firstName: 'Dr. Sneha',
      lastName: 'Nambiar',
      phone: '+91-9845022222',
      employeeNumber: 'FAC-ISE-001',
      departmentId: iseDeptId,
      branchId: mainCampusId,
      designation: 'Professor & HOD',
      qualification: 'Ph.D. Information Systems (IIT Madras)',
      experienceYears: 15,
      specialization: 'Database Systems, Information Architecture & Big Data',
      isHod: true,
    },
    {
      userId: '23333333-3333-3333-3333-333333333333',
      teacherId: 'fc333333-3333-3333-3333-333333333333',
      email: 'ramesh.hegde@hitm.edu.in',
      firstName: 'Dr. Ramesh',
      lastName: 'Hegde',
      phone: '+91-9845033333',
      employeeNumber: 'FAC-ECE-001',
      departmentId: eceDeptId,
      branchId: mainCampusId,
      designation: 'Professor & HOD',
      qualification: 'Ph.D. Microelectronics (NITK Surathkal)',
      experienceYears: 16,
      specialization: 'VLSI Design, Digital Signal Processing & Embedded Architectures',
      isHod: true,
    },
    {
      userId: '24444444-4444-4444-4444-444444444444',
      teacherId: 'fc444444-4444-4444-4444-444444444444',
      email: 'kavitha.murthy@hitm.edu.in',
      firstName: 'Dr. Kavitha',
      lastName: 'Murthy',
      phone: '+91-9845044444',
      employeeNumber: 'FAC-AIML-001',
      departmentId: aimlDeptId,
      branchId: ecCampusId,
      designation: 'Associate Professor & HOD',
      qualification: 'Ph.D. Artificial Intelligence (IIIT Hyderabad)',
      experienceYears: 11,
      specialization: 'Machine Learning, Deep Neural Networks & Computer Vision',
      isHod: true,
    },
    {
      userId: '25555555-5555-5555-5555-555555555555',
      teacherId: 'fc555555-5555-5555-5555-555555555555',
      email: 'priya.sharma@hitm.edu.in',
      firstName: 'Dr. Priya',
      lastName: 'Sharma',
      phone: '+91-9845055555',
      employeeNumber: 'FAC-BBA-001',
      departmentId: bbaDeptId,
      branchId: mainCampusId,
      designation: 'Associate Professor & HOD',
      qualification: 'Ph.D. Management Studies (IIM Bangalore), MBA (Finance)',
      experienceYears: 12,
      specialization: 'Corporate Finance, Strategic Management & Investment Banking',
      isHod: true,
    },
    {
      userId: '26666666-6666-6666-6666-666666666666',
      teacherId: 'fc666666-6666-6666-6666-666666666666',
      email: 'suresh.kumar@hitm.edu.in',
      firstName: 'Prof. Suresh',
      lastName: 'Kumar',
      phone: '+91-9845066666',
      employeeNumber: 'FAC-BCA-001',
      departmentId: bcaDeptId,
      branchId: ecCampusId,
      designation: 'Associate Professor & HOD',
      qualification: 'MCA, M.Phil, Ph.D. (Pursuing)',
      experienceYears: 10,
      specialization: 'Full Stack Web Architecture, Cloud Native Apps & Python',
      isHod: true,
    },
    {
      userId: '27777777-7777-7777-7777-777777777777',
      teacherId: 'fc777777-7777-7777-7777-777777777777',
      email: 'vikram.rathore@hitm.edu.in',
      firstName: 'Dr. Vikram',
      lastName: 'Rathore',
      phone: '+91-9845077777',
      employeeNumber: 'FAC-MECH-001',
      departmentId: mechDeptId,
      branchId: mainCampusId,
      designation: 'Professor & HOD',
      qualification: 'Ph.D. Robotics & Automation (IIT Delhi)',
      experienceYears: 17,
      specialization: 'Smart Manufacturing, Mechatronics, EV Dynamics & Thermal Fluids',
      isHod: true,
    },
    {
      userId: '28888888-8888-8888-8888-888888888888',
      teacherId: 'fc888888-8888-8888-8888-888888888888',
      email: 'ananya.deshmukh@hitm.edu.in',
      firstName: 'Dr. Ananya',
      lastName: 'Deshmukh',
      phone: '+91-9845088888',
      employeeNumber: 'FAC-MBA-001',
      departmentId: mbaDeptId,
      branchId: wfCampusId,
      designation: 'Professor & Dean MBA',
      qualification: 'Ph.D. Organizational Strategy (ISB Hyderabad), MBA',
      experienceYears: 19,
      specialization: 'Executive Leadership, Tech Strategy, Global Economics',
      isHod: true,
    },
    {
      userId: '29999999-9999-9999-9999-999999999999',
      teacherId: 'fc999999-9999-9999-9999-999999999999',
      email: 'deepak.verma@hitm.edu.in',
      firstName: 'Prof. Deepak',
      lastName: 'Verma',
      phone: '+91-9845099999',
      employeeNumber: 'FAC-CSE-002',
      departmentId: cseDeptId,
      branchId: mainCampusId,
      designation: 'Assistant Professor',
      qualification: 'M.Tech Software Systems (BITS Pilani)',
      experienceYears: 6,
      specialization: 'Operating Systems, Network Security & DevOps',
      isHod: false,
    },
    {
      userId: '2aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      teacherId: 'fcaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      email: 'pooja.nair@hitm.edu.in',
      firstName: 'Prof. Pooja',
      lastName: 'Nair',
      phone: '+91-9845011223',
      employeeNumber: 'FAC-AIML-002',
      departmentId: aimlDeptId,
      branchId: ecCampusId,
      designation: 'Assistant Professor',
      qualification: 'M.Tech Data Analytics (NIT Trichy)',
      experienceYears: 5,
      specialization: 'Natural Language Processing & Generative Models',
      isHod: false,
    },
    {
      userId: '2bbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      teacherId: 'fcbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      email: 'aravind.swamy@hitm.edu.in',
      firstName: 'Dr. Aravind',
      lastName: 'Swamy',
      phone: '+91-9845011334',
      employeeNumber: 'FAC-ECE-002',
      departmentId: eceDeptId,
      branchId: ecCampusId,
      designation: 'Assistant Professor',
      qualification: 'Ph.D. RF & Microwave Engineering (IIT Roorkee)',
      experienceYears: 8,
      specialization: 'Wireless Communications & Antenna Systems',
      isHod: false,
    },
    {
      userId: '2ccccccc-cccc-cccc-cccc-cccccccccccc',
      teacherId: 'fccccccc-cccc-cccc-cccc-cccccccccccc',
      email: 'rohit.gupta@hitm.edu.in',
      firstName: 'Prof. Rohit',
      lastName: 'Gupta',
      phone: '+91-9845011445',
      employeeNumber: 'FAC-BBA-002',
      departmentId: bbaDeptId,
      branchId: mainCampusId,
      designation: 'Assistant Professor',
      qualification: 'MBA Marketing (XLRI Jamshedpur)',
      experienceYears: 7,
      specialization: 'Digital Marketing, Brand Architecture & Consumer Insights',
      isHod: false,
    },
  ];

  const facultyPassword = await bcrypt.hash('Faculty123!', 10);
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
        passwordHash: facultyPassword,
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

    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {
        departmentId: f.departmentId,
        branchId: f.branchId,
        designation: f.designation,
        qualification: f.qualification,
        experienceYears: f.experienceYears,
        specialization: f.specialization,
        salaryStructure: {
          basicPay: 75000,
          hra: 25000,
          da: 18000,
          specialAllowance: 12000,
          pfDeduction: 9000,
          netSalary: 121000,
        },
      },
      create: {
        id: f.teacherId,
        academyId,
        branchId: f.branchId,
        departmentId: f.departmentId,
        userId: user.id,
        employeeNumber: f.employeeNumber,
        designation: f.designation,
        qualification: f.qualification,
        experienceYears: f.experienceYears,
        specialization: f.specialization,
        status: 'active',
        salaryStructure: {
          basicPay: 75000,
          hra: 25000,
          da: 18000,
          specialAllowance: 12000,
          pfDeduction: 9000,
          netSalary: 121000,
        },
      },
    });

    if (f.isHod) {
      await prisma.department.update({
        where: { id: f.departmentId },
        data: { hodId: teacher.id },
      });
    }

    // Teacher Attendance
    await prisma.teacherAttendance.upsert({
      where: { uq_teacher_attendance: { teacherId: teacher.id, date: new Date('2026-09-28') } },
      update: { status: 'present' },
      create: {
        academyId,
        teacherId: teacher.id,
        date: new Date('2026-09-28'),
        status: 'present',
        remarks: 'Biometric verified at Main Gate (08:52 AM)',
      },
    });

    await prisma.teacherAttendance.upsert({
      where: { uq_teacher_attendance: { teacherId: teacher.id, date: new Date('2026-09-29') } },
      update: { status: 'present' },
      create: {
        academyId,
        teacherId: teacher.id,
        date: new Date('2026-09-29'),
        status: 'present',
        remarks: 'Biometric verified at Main Gate (08:55 AM)',
      },
    });
  }

  // Teacher Leaves
  await prisma.teacherLeave.upsert({
    where: { id: '6809f0a8-9a1e-89a5-082f-2b8232e32636' },
    update: {},
    create: {
      id: '6809f0a8-9a1e-89a5-082f-2b8232e32636',
      academyId,
      teacherId: 'fc999999-9999-9999-9999-999999999999', // Deepak Verma
      leaveType: 'Conference Duty',
      startsAt: new Date('2026-10-10'),
      endsAt: new Date('2026-10-12'),
      status: 'approved',
      reason: 'Paper presentation at IEEE International Conference on Cloud Systems',
      approvedById: adminUserId,
    },
  });

  await prisma.teacherLeave.upsert({
    where: { id: '819a2c8d-2296-1754-d1c7-5d04ff70020b' },
    update: {},
    create: {
      id: '819a2c8d-2296-1754-d1c7-5d04ff70020b',
      academyId,
      teacherId: 'fcaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Pooja Nair
      leaveType: 'Casual Leave',
      startsAt: new Date('2026-10-05'),
      endsAt: new Date('2026-10-06'),
      status: 'pending',
      reason: 'Personal family event',
    },
  });

  // =========================================================================
  // 8. SUBJECTS & CURRICULUM (Across All Courses & Semesters)
  // =========================================================================
  console.log('📖 8. Seeding Subjects & Curriculum for all courses...');
  const subjectsData = [
    // B.Tech CSE (Main)
    { id: '33a4cbb8-7491-352c-18dc-13843d8bfc30', courseId: cMainCseId, departmentId: cseDeptId, semester: 3, name: 'Data Structures & Algorithms', code: 'CS301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Abstract Data Types, Trees, Graphs, Greedy, Dynamic Programming & Complexity Analysis.' },
    { id: '612954d7-d790-f7de-585e-502644774255', courseId: cMainCseId, departmentId: cseDeptId, semester: 3, name: 'Database Management Systems', code: 'CS302', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Relational Algebra, SQL, Normalization, Query Processing, ACID Transactions and Indexing.' },
    { id: 'f86ba37d-5f57-ad61-04c9-a9761e0e4555', courseId: cMainCseId, departmentId: cseDeptId, semester: 3, name: 'Operating Systems & System Calls', code: 'CS303', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Processes, Threads, CPU Scheduling, Synchronization, Memory Management, File Systems.' },
    { id: '377a0905-a971-c3fb-8ccf-3614031d5380', courseId: cMainCseId, departmentId: cseDeptId, semester: 3, name: 'Data Structures Laboratory', code: 'CS304L', subjectType: 'lab', credits: 2, internalMarks: 50, externalMarks: 50, totalMarks: 100, passingMarks: 40, description: 'Hands-on C++/Java implementations of Stacks, Queues, Binary Search Trees, AVL Trees, Graphs.' },
    { id: '0920c42a-0f93-d7a6-5b43-d37a5239d266', courseId: cMainCseId, departmentId: cseDeptId, semester: 1, name: 'Engineering Mathematics I', code: 'CS101', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Linear Algebra, Differential Calculus, Vector Spaces and Matrix Decomposition.' },

    // B.Tech ISE (Main)
    { id: '9f6aca1d-e8bb-2b51-9317-11275cbf2881', courseId: cMainIseId, departmentId: iseDeptId, semester: 3, name: 'Data Structures & Applications', code: 'IS301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Data Structures with practical software modeling emphasis.' },
    { id: '00e06472-c033-8c39-98c3-edfc6f8c642b', courseId: cMainIseId, departmentId: iseDeptId, semester: 3, name: 'Advanced Web Technologies & REST APIs', code: 'IS302', subjectType: 'lab', credits: 4, internalMarks: 50, externalMarks: 50, totalMarks: 100, passingMarks: 40, description: 'Next.js, Node.js, TypeScript, PostgreSQL, GraphQL & Cloud Deployment.' },
    { id: '912a4cb4-731c-3af6-a2de-9db2c3da3c23', courseId: cMainIseId, departmentId: iseDeptId, semester: 3, name: 'Enterprise Database Systems', code: 'IS303', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Distributed databases, NoSQL, Sharding, Replication and Concurrency.' },

    // B.Tech ECE (Main)
    { id: 'a8113f83-4cd6-01ca-3e94-5b3f1258f505', courseId: cMainEceId, departmentId: eceDeptId, semester: 3, name: 'Digital Electronics & Logic Design', code: 'EC301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'K-Maps, Sequential Circuits, Counters, Registers, Verilog HDL.' },
    { id: '7716ea1f-a72e-dcd1-1202-3a4df5f9fb80', courseId: cMainEceId, departmentId: eceDeptId, semester: 3, name: 'Signals & Continuous Systems', code: 'EC302', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Fourier Transform, Laplace Transform, Z-Transform and Convolution.' },
    { id: 'fe8ca1d6-6353-21b1-a4ee-101a7c710787', courseId: cMainEceId, departmentId: eceDeptId, semester: 3, name: 'Analog Circuit Design', code: 'EC303', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Op-Amps, BJT biasing, MOSFET amplifiers and Active Filters.' },

    // B.Tech AIML (Main & EC)
    { id: 'ea7f31ff-5957-b3e5-54f4-73a7f522923b', courseId: cMainAimlId, departmentId: aimlDeptId, semester: 3, name: 'Machine Learning Foundations', code: 'AI301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Supervised, Unsupervised learning, Scikit-Learn, Regression, SVM, Random Forests.' },
    { id: '61dda9b7-9197-b6c4-c5aa-c9382d00b7d6', courseId: cMainAimlId, departmentId: aimlDeptId, semester: 3, name: 'Deep Learning & Neural Networks', code: 'AI302', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'CNNs, RNNs, Transformers, PyTorch, Backpropagation and Attention Mechanisms.' },
    { id: '45532687-54bf-46c6-f182-4782d4864785', courseId: cMainAimlId, departmentId: aimlDeptId, semester: 3, name: 'Applied AI & Python Laboratory', code: 'AI303L', subjectType: 'lab', credits: 2, internalMarks: 50, externalMarks: 50, totalMarks: 100, passingMarks: 40, description: 'PyTorch and TensorFlow model development, fine-tuning and evaluation.' },

    // BBA Honors
    { id: 'c63c45ac-3025-715b-e55e-69b2306ee35a', courseId: cMainBbaId, departmentId: bbaDeptId, semester: 1, name: 'Financial Accounting & Reporting', code: 'BB101', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Double Entry Bookkeeping, Trial Balance, P&L Statements and Balance Sheets.' },
    { id: 'f45adf59-0e3b-2626-eae7-f3a05826c8d9', courseId: cMainBbaId, departmentId: bbaDeptId, semester: 1, name: 'Principles of Management & Strategy', code: 'BB102', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Planning, Organizing, Leading, Controlling and Organizational Behavior.' },
    { id: '4038d9ef-d10a-a52a-949b-84f58e618764', courseId: cMainBbaId, departmentId: bbaDeptId, semester: 1, name: 'Managerial Economics', code: 'BB103', subjectType: 'theory', credits: 3, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Elasticity, Market Structures, Game Theory and Price Strategies.' },

    // BCA Pro
    { id: '6516ba57-5e5e-af9a-71cf-3364cd5e3f12', courseId: cMainBcaId, departmentId: bcaDeptId, semester: 3, name: 'Object Oriented Programming with Java', code: 'CA301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Core Java, Generics, Collections, Multithreading, Streams and JDBC.' },
    { id: 'bd57f3f2-f5e0-0d20-c303-e440ad59f409', courseId: cMainBcaId, departmentId: bcaDeptId, semester: 3, name: 'Relational Database Management with SQL', code: 'CA302', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'PostgreSQL queries, Stored Procedures, Triggers and DB Administration.' },
    { id: 'b5f53b9c-6763-d0cd-b07c-1eac7c7ed88a', courseId: cMainBcaId, departmentId: bcaDeptId, semester: 3, name: 'Full Stack Web Lab (React & Node)', code: 'CA303L', subjectType: 'lab', credits: 3, internalMarks: 50, externalMarks: 50, totalMarks: 100, passingMarks: 40, description: 'Full stack CRUD portal development with Authentication and Deployment.' },

    // B.Tech Mech
    { id: '096086cf-ba05-995c-70f0-5ca393e38cee', courseId: cMainMechId, departmentId: mechDeptId, semester: 3, name: 'Thermodynamics & Fluid Dynamics', code: 'ME301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'First and Second Laws of Thermodynamics, Carnot Cycle, Fluid Statics.' },
    { id: '375d2bed-832e-ef6b-7843-7a196d91e693', courseId: cMainMechId, departmentId: mechDeptId, semester: 3, name: 'Mechatronics & Sensor Automation', code: 'ME302', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Microcontrollers, Actuators, PLCs, Sensor Integration and Robot Kinematics.' },

    // EC Campus Courses Subjects
    { id: '3b83e6e8-7c93-bcc9-59cc-f6546e705875', courseId: cEcCseId, departmentId: cseDeptId, semester: 3, name: 'Cloud Architecture & AWS Microservices', code: 'EC-CS301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Docker, Kubernetes, AWS Lambda, Serverless and Distributed Systems.' },
    { id: '9b5552a3-b878-7c75-ee7c-faf1bd38d79a', courseId: cEcAimlId, departmentId: aimlDeptId, semester: 3, name: 'Big Data Processing with Spark', code: 'EC-DS301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'PySpark, Hadoop, Data Lakehouses, ETL pipelines and real-time streaming.' },

    // Whitefield Campus Subjects
    { id: '3a80f851-d748-42aa-3cb7-c4a0f15708ed', courseId: cWfCseId, departmentId: cseDeptId, semester: 3, name: 'Software Product Engineering & Architecture', code: 'WF-CS301', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Domain Driven Design, Clean Architecture, CI/CD and Observability.' },
    { id: 'f4aa5572-5e7f-63ff-108e-c532df237de6', courseId: cWfMbaId, departmentId: mbaDeptId, semester: 1, name: 'Strategic Corporate Management', code: 'MBA101', subjectType: 'theory', credits: 4, internalMarks: 40, externalMarks: 60, totalMarks: 100, passingMarks: 40, description: 'Corporate Strategy, Competitive Analysis, Mergers & Acquisitions.' },
  ];

  for (const s of subjectsData) {
    await prisma.subject.upsert({
      where: { id: s.id },
      update: {
        name: s.name,
        code: s.code,
        courseId: s.courseId,
        departmentId: s.departmentId,
        semester: s.semester,
        subjectType: s.subjectType,
        credits: s.credits,
        internalMarks: s.internalMarks,
        externalMarks: s.externalMarks,
        totalMarks: s.totalMarks,
        passingMarks: s.passingMarks,
        description: s.description,
        status: 'active',
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

  // Teacher Subject Mapping
  const teacherSubjectMappings = [
    { id: '4cf241ea-f9ae-c2b5-0a13-1771ba1c5361', teacherId: 'fc111111-1111-1111-1111-111111111111', subjectId: '33a4cbb8-7491-352c-18dc-13843d8bfc30', courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', branchId: mainCampusId },
    { id: '303c8757-7caf-dc04-5dfc-bbf84068b7c3', teacherId: 'fc111111-1111-1111-1111-111111111111', subjectId: '612954d7-d790-f7de-585e-502644774255', courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', branchId: mainCampusId },
    { id: 'd83918b9-9beb-b855-77a8-d26ca0384900', teacherId: 'fc999999-9999-9999-9999-999999999999', subjectId: 'f86ba37d-5f57-ad61-04c9-a9761e0e4555', courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', branchId: mainCampusId },
    { id: '42d5790e-9890-230e-96ea-6133965c4cc3', teacherId: 'fc222222-2222-2222-2222-222222222222', subjectId: '9f6aca1d-e8bb-2b51-9317-11275cbf2881', courseId: cMainIseId, batchId: 'ba333333-3333-3333-3333-333333333333', branchId: mainCampusId },
    { id: '21441226-3cac-2c73-68b2-80402f827c4b', teacherId: 'fc222222-2222-2222-2222-222222222222', subjectId: '00e06472-c033-8c39-98c3-edfc6f8c642b', courseId: cMainIseId, batchId: 'ba333333-3333-3333-3333-333333333333', branchId: mainCampusId },
    { id: 'cdd5f843-fa1c-107e-62e7-f065b58680c8', teacherId: 'fc333333-3333-3333-3333-333333333333', subjectId: 'a8113f83-4cd6-01ca-3e94-5b3f1258f505', courseId: cMainEceId, batchId: 'ba444444-4444-4444-4444-444444444444', branchId: mainCampusId },
    { id: 'fdaf72ed-8e1d-5487-f5e4-c20fdc4eb82f', teacherId: 'fc444444-4444-4444-4444-444444444444', subjectId: 'ea7f31ff-5957-b3e5-54f4-73a7f522923b', courseId: cMainAimlId, batchId: 'ba555555-5555-5555-5555-555555555555', branchId: mainCampusId },
    { id: 'bd1b0050-73cd-3a26-4578-a8ddff508884', teacherId: 'fcaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', subjectId: '61dda9b7-9197-b6c4-c5aa-c9382d00b7d6', courseId: cMainAimlId, batchId: 'ba555555-5555-5555-5555-555555555555', branchId: mainCampusId },
    { id: 'd25285ae-ce1d-ad9a-6ed2-6592bdfa329e', teacherId: 'fc555555-5555-5555-5555-555555555555', subjectId: 'c63c45ac-3025-715b-e55e-69b2306ee35a', courseId: cMainBbaId, batchId: 'ba666666-6666-6666-6666-666666666666', branchId: mainCampusId },
    { id: '4c5253c3-494a-12df-de82-54ab7286d43a', teacherId: 'fccccccc-cccc-cccc-cccc-cccccccccccc', subjectId: 'f45adf59-0e3b-2626-eae7-f3a05826c8d9', courseId: cMainBbaId, batchId: 'ba666666-6666-6666-6666-666666666666', branchId: mainCampusId },
    { id: '0a7e842e-6ede-cfc2-61a7-2f972e6ccb5d', teacherId: 'fc666666-6666-6666-6666-666666666666', subjectId: '6516ba57-5e5e-af9a-71cf-3364cd5e3f12', courseId: cMainBcaId, batchId: 'ba777777-7777-7777-7777-777777777777', branchId: mainCampusId },
    { id: 'dcbd7a89-802f-5ccd-291c-01b93d952050', teacherId: 'fc777777-7777-7777-7777-777777777777', subjectId: '096086cf-ba05-995c-70f0-5ca393e38cee', courseId: cMainMechId, batchId: 'ba888888-8888-8888-8888-888888888888', branchId: mainCampusId },
    { id: 'b44d862c-6e7a-46aa-ab92-2a0ffae49c92', teacherId: 'fc111111-1111-1111-1111-111111111111', subjectId: '3b83e6e8-7c93-bcc9-59cc-f6546e705875', courseId: cEcCseId, batchId: 'ba999999-9999-9999-9999-999999999999', branchId: ecCampusId },
    { id: '0bd4bf0d-8fc2-3383-de15-06716200311b', teacherId: 'fc444444-4444-4444-4444-444444444444', subjectId: '9b5552a3-b878-7c75-ee7c-faf1bd38d79a', courseId: cEcAimlId, batchId: 'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', branchId: ecCampusId },
    { id: '47199c3d-6084-336a-7fe8-7c7853830bdc', teacherId: 'fc888888-8888-8888-8888-888888888888', subjectId: 'f4aa5572-5e7f-63ff-108e-c532df237de6', courseId: cWfMbaId, batchId: 'baffffff-ffff-ffff-ffff-ffffffffffff', branchId: wfCampusId },
  ];

  for (const ts of teacherSubjectMappings) {
    await prisma.teacherSubject.upsert({
      where: { id: ts.id },
      update: {},
      create: {
        id: ts.id,
        academyId,
        branchId: ts.branchId,
        courseId: ts.courseId,
        subjectId: ts.subjectId,
        batchId: ts.batchId,
        teacherId: ts.teacherId,
      },
    });
  }

  // =========================================================================
  // 9. TIMETABLE SCHEDULES (Full Week Matrix across Rooms & Labs)
  // =========================================================================
  console.log('🗓️ 9. Seeding Comprehensive Timetable Matrix...');
  const timetableEntries = [
    // CSE Sem 3A (Main Campus)
    { id: '00367a07-d07d-c036-0ea4-85aa1d0ce3f9', branchId: mainCampusId, departmentId: cseDeptId, courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: '33a4cbb8-7491-352c-18dc-13843d8bfc30', teacherId: 'fc111111-1111-1111-1111-111111111111', dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00', roomNumber: 'Aryabhata Hall 301', isLab: false },
    { id: '12863462-f4b8-3cb6-3123-f439b6b9a810', branchId: mainCampusId, departmentId: cseDeptId, courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: '612954d7-d790-f7de-585e-502644774255', teacherId: 'fc111111-1111-1111-1111-111111111111', dayOfWeek: 'Monday', startTime: '10:00', endTime: '11:00', roomNumber: 'Aryabhata Hall 301', isLab: false },
    { id: '6e2c02d3-8395-a461-4e25-710044e2938d', branchId: mainCampusId, departmentId: cseDeptId, courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: 'f86ba37d-5f57-ad61-04c9-a9761e0e4555', teacherId: 'fc999999-9999-9999-9999-999999999999', dayOfWeek: 'Monday', startTime: '11:15', endTime: '12:15', roomNumber: 'Aryabhata Hall 301', isLab: false },
    { id: '1e3c98e8-44f9-f896-7e3c-4e1ed38fd708', branchId: mainCampusId, departmentId: cseDeptId, courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: '377a0905-a971-c3fb-8ccf-3614031d5380', teacherId: 'fc111111-1111-1111-1111-111111111111', dayOfWeek: 'Tuesday', startTime: '13:30', endTime: '16:30', roomNumber: 'Advanced Computing Lab 1', isLab: true },
    { id: '818d70ba-0888-ea63-ec59-62b7114a4725', branchId: mainCampusId, departmentId: cseDeptId, courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: '33a4cbb8-7491-352c-18dc-13843d8bfc30', teacherId: 'fc111111-1111-1111-1111-111111111111', dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '10:00', roomNumber: 'Aryabhata Hall 301', isLab: false },
    { id: 'f87e7f94-807a-4794-24af-e2e2adebe05f', branchId: mainCampusId, departmentId: cseDeptId, courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: '612954d7-d790-f7de-585e-502644774255', teacherId: 'fc111111-1111-1111-1111-111111111111', dayOfWeek: 'Thursday', startTime: '10:00', endTime: '11:00', roomNumber: 'Aryabhata Hall 302', isLab: false },
    { id: '15549486-8535-5347-ba16-7b5215a6e1d8', branchId: mainCampusId, departmentId: cseDeptId, courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: 'f86ba37d-5f57-ad61-04c9-a9761e0e4555', teacherId: 'fc999999-9999-9999-9999-999999999999', dayOfWeek: 'Friday', startTime: '11:15', endTime: '12:15', roomNumber: 'Aryabhata Hall 301', isLab: false },

    // ISE Sem 3A (Main Campus)
    { id: 'ba3a05e5-9a12-8fac-f691-f02e9b14206d', branchId: mainCampusId, departmentId: iseDeptId, courseId: cMainIseId, batchId: 'ba333333-3333-3333-3333-333333333333', subjectId: '9f6aca1d-e8bb-2b51-9317-11275cbf2881', teacherId: 'fc222222-2222-2222-2222-222222222222', dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00', roomNumber: 'Turing Hall 201', isLab: false },
    { id: '5f502b68-e3d6-dff0-d4b2-15eb83f1c0f1', branchId: mainCampusId, departmentId: iseDeptId, courseId: cMainIseId, batchId: 'ba333333-3333-3333-3333-333333333333', subjectId: '00e06472-c033-8c39-98c3-edfc6f8c642b', teacherId: 'fc222222-2222-2222-2222-222222222222', dayOfWeek: 'Wednesday', startTime: '13:30', endTime: '16:30', roomNumber: 'Web Development Lab 2', isLab: true },

    // AIML Sem 3A (Main Campus)
    { id: '37d58df6-aaf8-16cc-0232-407a45097458', branchId: mainCampusId, departmentId: aimlDeptId, courseId: cMainAimlId, batchId: 'ba555555-5555-5555-5555-555555555555', subjectId: 'ea7f31ff-5957-b3e5-54f4-73a7f522923b', teacherId: 'fc444444-4444-4444-4444-444444444444', dayOfWeek: 'Tuesday', startTime: '10:00', endTime: '11:00', roomNumber: 'AI Innovation Hall 401', isLab: false },
    { id: 'c1d14a54-e786-51bb-7e00-eb17df37ad9e', branchId: mainCampusId, departmentId: aimlDeptId, courseId: cMainAimlId, batchId: 'ba555555-5555-5555-5555-555555555555', subjectId: '61dda9b7-9197-b6c4-c5aa-c9382d00b7d6', teacherId: 'fcaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', dayOfWeek: 'Thursday', startTime: '11:15', endTime: '12:15', roomNumber: 'AI Innovation Hall 401', isLab: false },

    // BBA Sem 1A (Main Campus)
    { id: '65005731-6b14-e55d-654f-f0417e512da2', branchId: mainCampusId, departmentId: bbaDeptId, courseId: cMainBbaId, batchId: 'ba666666-6666-6666-6666-666666666666', subjectId: 'c63c45ac-3025-715b-e55e-69b2306ee35a', teacherId: 'fc555555-5555-5555-5555-555555555555', dayOfWeek: 'Monday', startTime: '10:00', endTime: '11:00', roomNumber: 'Management Block 102', isLab: false },
    { id: '29790c90-a41a-13ff-ac2b-0355ce4a457d', branchId: mainCampusId, departmentId: bbaDeptId, courseId: cMainBbaId, batchId: 'ba666666-6666-6666-6666-666666666666', subjectId: 'f45adf59-0e3b-2626-eae7-f3a05826c8d9', teacherId: 'fccccccc-cccc-cccc-cccc-cccccccccccc', dayOfWeek: 'Wednesday', startTime: '11:15', endTime: '12:15', roomNumber: 'Management Block 102', isLab: false },

    // EC Campus Cloud Batch
    { id: '4f8a4b92-38b5-b216-1171-0e2d63de7633', branchId: ecCampusId, departmentId: cseDeptId, courseId: cEcCseId, batchId: 'ba999999-9999-9999-9999-999999999999', subjectId: '3b83e6e8-7c93-bcc9-59cc-f6546e705875', teacherId: 'fc111111-1111-1111-1111-111111111111', dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '10:00', roomNumber: 'EC Tech Arena 101', isLab: false },

    // Whitefield MBA Batch
    { id: 'd33a663a-f7cc-972a-21a4-2bf6aade59b0', branchId: wfCampusId, departmentId: mbaDeptId, courseId: cWfMbaId, batchId: 'baffffff-ffff-ffff-ffff-ffffffffffff', subjectId: 'f4aa5572-5e7f-63ff-108e-c532df237de6', teacherId: 'fc888888-8888-8888-8888-888888888888', dayOfWeek: 'Saturday', startTime: '10:00', endTime: '13:00', roomNumber: 'Executive Boardroom WF-2', isLab: false },
  ];

  for (const t of timetableEntries) {
    await prisma.timetableSchedule.upsert({
      where: { id: t.id },
      update: {
        startTime: t.startTime,
        endTime: t.endTime,
        roomNumber: t.roomNumber,
        isLab: t.isLab,
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
        isLab: t.isLab,
        status: 'active',
      },
    });
  }

  // =========================================================================
  // 10. STUDENTS (30+ Diverse Candidates across All Courses & Branches)
  // =========================================================================
  console.log('🎓 10. Seeding 30+ Students across all campuses & courses...');
  const studentPassword = await bcrypt.hash('Student123!', 10);

  const rawStudents = [
    // B.Tech CSE (Main Campus) - 6 Students
    { id: 1, email: 'arjun.kumar@hitm.edu.in', firstName: 'Arjun', lastName: 'Kumar', phone: '+91-9741000001', courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', departmentId: cseDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-CSE-001', rollNo: '1HY25CS001', usn: 'USN-2025-CS-001', admYear: '2025', dob: '2007-04-12', gender: 'male', blood: 'O+', parent: 'Ramesh Kumar', parentPhone: '+91-9741900001', cgpa: 8.95 },
    { id: 2, email: 'priya.patel@hitm.edu.in', firstName: 'Priya', lastName: 'Patel', phone: '+91-9741000002', courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', departmentId: cseDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-CSE-002', rollNo: '1HY25CS002', usn: 'USN-2025-CS-002', admYear: '2025', dob: '2007-08-19', gender: 'female', blood: 'A+', parent: 'Sunil Patel', parentPhone: '+91-9741900002', cgpa: 9.20 },
    { id: 3, email: 'karthik.rajan@hitm.edu.in', firstName: 'Karthik', lastName: 'Rajan', phone: '+91-9741000003', courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', departmentId: cseDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-CSE-003', rollNo: '1HY25CS003', usn: 'USN-2025-CS-003', admYear: '2025', dob: '2007-01-25', gender: 'male', blood: 'B+', parent: 'M. Rajan', parentPhone: '+91-9741900003', cgpa: 8.45 },
    { id: 4, email: 'ananya.iyer@hitm.edu.in', firstName: 'Ananya', lastName: 'Iyer', phone: '+91-9741000004', courseId: cMainCseId, batchId: 'ba111111-1111-1111-1111-111111111111', departmentId: cseDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-CSE-004', rollNo: '1HY25CS004', usn: 'USN-2025-CS-004', admYear: '2025', dob: '2007-11-05', gender: 'female', blood: 'AB+', parent: 'S. Iyer', parentPhone: '+91-9741900004', cgpa: 9.40 },
    { id: 5, email: 'rohit.reddy@hitm.edu.in', firstName: 'Rohit', lastName: 'Reddy', phone: '+91-9741000005', courseId: cMainCseId, batchId: 'ba222222-2222-2222-2222-222222222222', departmentId: cseDeptId, branchId: mainCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-CSE-005', rollNo: '1HY26CS005', usn: 'USN-2026-CS-005', admYear: '2026', dob: '2008-03-14', gender: 'male', blood: 'O+', parent: 'Venkat Reddy', parentPhone: '+91-9741900005', cgpa: 8.10 },
    { id: 6, email: 'tanvi.joshi@hitm.edu.in', firstName: 'Tanvi', lastName: 'Joshi', phone: '+91-9741000006', courseId: cMainCseId, batchId: 'ba222222-2222-2222-2222-222222222222', departmentId: cseDeptId, branchId: mainCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-CSE-006', rollNo: '1HY26CS006', usn: 'USN-2026-CS-006', admYear: '2026', dob: '2008-07-22', gender: 'female', blood: 'B-', parent: 'Pradeep Joshi', parentPhone: '+91-9741900006', cgpa: 8.75 },

    // B.Tech ISE (Main Campus) - 4 Students
    { id: 7, email: 'sneha.ranganathan@hitm.edu.in', firstName: 'Sneha', lastName: 'Ranganathan', phone: '+91-9741000007', courseId: cMainIseId, batchId: 'ba333333-3333-3333-3333-333333333333', departmentId: iseDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ISE-001', rollNo: '1HY25IS001', usn: 'USN-2025-IS-001', admYear: '2025', dob: '2007-06-18', gender: 'female', blood: 'A+', parent: 'Ranganathan S', parentPhone: '+91-9741900007', cgpa: 8.85 },
    { id: 8, email: 'varun.menon@hitm.edu.in', firstName: 'Varun', lastName: 'Menon', phone: '+91-9741000008', courseId: cMainIseId, batchId: 'ba333333-3333-3333-3333-333333333333', departmentId: iseDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ISE-002', rollNo: '1HY25IS002', usn: 'USN-2025-IS-002', admYear: '2025', dob: '2007-09-30', gender: 'male', blood: 'O+', parent: 'K. Menon', parentPhone: '+91-9741900008', cgpa: 8.30 },
    { id: 9, email: 'meera.nair@hitm.edu.in', firstName: 'Meera', lastName: 'Nair', phone: '+91-9741000009', courseId: cMainIseId, batchId: 'ba333333-3333-3333-3333-333333333333', departmentId: iseDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ISE-003', rollNo: '1HY25IS003', usn: 'USN-2025-IS-003', admYear: '2025', dob: '2007-12-14', gender: 'female', blood: 'B+', parent: 'G. Nair', parentPhone: '+91-9741900009', cgpa: 9.10 },
    { id: 10, email: 'aditya.shukla@hitm.edu.in', firstName: 'Aditya', lastName: 'Shukla', phone: '+91-9741000010', courseId: cMainIseId, batchId: 'ba333333-3333-3333-3333-333333333333', departmentId: iseDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ISE-004', rollNo: '1HY25IS004', usn: 'USN-2025-IS-004', admYear: '2025', dob: '2007-05-02', gender: 'male', blood: 'AB+', parent: 'M. Shukla', parentPhone: '+91-9741900010', cgpa: 8.60 },

    // B.Tech ECE (Main Campus) - 3 Students
    { id: 11, email: 'harish.kalyan@hitm.edu.in', firstName: 'Harish', lastName: 'Kalyan', phone: '+91-9741000011', courseId: cMainEceId, batchId: 'ba444444-4444-4444-4444-444444444444', departmentId: eceDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ECE-001', rollNo: '1HY25EC001', usn: 'USN-2025-EC-001', admYear: '2025', dob: '2007-03-20', gender: 'male', blood: 'O-', parent: 'Kalyan Sundaram', parentPhone: '+91-9741900011', cgpa: 8.50 },
    { id: 12, email: 'divya.krishna@hitm.edu.in', firstName: 'Divya', lastName: 'Krishna', phone: '+91-9741000012', courseId: cMainEceId, batchId: 'ba444444-4444-4444-4444-444444444444', departmentId: eceDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ECE-002', rollNo: '1HY25EC002', usn: 'USN-2025-EC-002', admYear: '2025', dob: '2007-10-10', gender: 'female', blood: 'A-', parent: 'Krishna Murthy', parentPhone: '+91-9741900012', cgpa: 9.05 },
    { id: 13, email: 'siddharth.roy@hitm.edu.in', firstName: 'Siddharth', lastName: 'Roy', phone: '+91-9741000013', courseId: cMainEceId, batchId: 'ba444444-4444-4444-4444-444444444444', departmentId: eceDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ECE-003', rollNo: '1HY25EC003', usn: 'USN-2025-EC-003', admYear: '2025', dob: '2007-02-17', gender: 'male', blood: 'B+', parent: 'Subhash Roy', parentPhone: '+91-9741900013', cgpa: 8.25 },

    // B.Tech AIML (Main Campus) - 3 Students
    { id: 14, email: 'nikhil.sinha@hitm.edu.in', firstName: 'Nikhil', lastName: 'Sinha', phone: '+91-9741000014', courseId: cMainAimlId, batchId: 'ba555555-5555-5555-5555-555555555555', departmentId: aimlDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-AI-001', rollNo: '1HY25AI001', usn: 'USN-2025-AI-001', admYear: '2025', dob: '2007-07-11', gender: 'male', blood: 'O+', parent: 'Rajesh Sinha', parentPhone: '+91-9741900014', cgpa: 9.35 },
    { id: 15, email: 'pooja.hegde@hitm.edu.in', firstName: 'Pooja', lastName: 'Hegde', phone: '+91-9741000015', courseId: cMainAimlId, batchId: 'ba555555-5555-5555-5555-555555555555', departmentId: aimlDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-AI-002', rollNo: '1HY25AI002', usn: 'USN-2025-AI-002', admYear: '2025', dob: '2007-09-08', gender: 'female', blood: 'A+', parent: 'Anand Hegde', parentPhone: '+91-9741900015', cgpa: 8.90 },
    { id: 16, email: 'manish.pandey@hitm.edu.in', firstName: 'Manish', lastName: 'Pandey', phone: '+91-9741000016', courseId: cMainAimlId, batchId: 'ba555555-5555-5555-5555-555555555555', departmentId: aimlDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-AI-003', rollNo: '1HY25AI003', usn: 'USN-2025-AI-003', admYear: '2025', dob: '2007-12-28', gender: 'male', blood: 'B+', parent: 'Vinod Pandey', parentPhone: '+91-9741900016', cgpa: 8.40 },

    // BBA Honors (Main Campus) - 3 Students
    { id: 17, email: 'rahul.sharma@hitm.edu.in', firstName: 'Rahul', lastName: 'Sharma', phone: '+91-9741000017', courseId: cMainBbaId, batchId: 'ba666666-6666-6666-6666-666666666666', departmentId: bbaDeptId, branchId: mainCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-BBA-001', rollNo: '1HY26BB001', usn: 'USN-2026-BB-001', admYear: '2026', dob: '2008-02-18', gender: 'male', blood: 'B+', parent: 'Sanjay Sharma', parentPhone: '+91-9741900017', cgpa: 8.65 },
    { id: 18, email: 'ishita.desai@hitm.edu.in', firstName: 'Ishita', lastName: 'Desai', phone: '+91-9741000018', courseId: cMainBbaId, batchId: 'ba666666-6666-6666-6666-666666666666', departmentId: bbaDeptId, branchId: mainCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-BBA-002', rollNo: '1HY26BB002', usn: 'USN-2026-BB-002', admYear: '2026', dob: '2008-04-14', gender: 'female', blood: 'O+', parent: 'Mihir Desai', parentPhone: '+91-9741900018', cgpa: 9.15 },
    { id: 19, email: 'karan.johar@hitm.edu.in', firstName: 'Karan', lastName: 'Singhania', phone: '+91-9741000019', courseId: cMainBbaId, batchId: 'ba666666-6666-6666-6666-666666666666', departmentId: bbaDeptId, branchId: mainCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-BBA-003', rollNo: '1HY26BB003', usn: 'USN-2026-BB-003', admYear: '2026', dob: '2008-11-20', gender: 'male', blood: 'A+', parent: 'V. Singhania', parentPhone: '+91-9741900019', cgpa: 8.35 },

    // BCA Pro (Main Campus) - 2 Students
    { id: 20, email: 'deepika.padukone@hitm.edu.in', firstName: 'Deepika', lastName: 'Rao', phone: '+91-9741000020', courseId: cMainBcaId, batchId: 'ba777777-7777-7777-7777-777777777777', departmentId: bcaDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-BCA-001', rollNo: '1HY25CA001', usn: 'USN-2025-CA-001', admYear: '2025', dob: '2007-05-19', gender: 'female', blood: 'O+', parent: 'P. Rao', parentPhone: '+91-9741900020', cgpa: 8.90 },
    { id: 21, email: 'akash.verma@hitm.edu.in', firstName: 'Akash', lastName: 'Verma', phone: '+91-9741000021', courseId: cMainBcaId, batchId: 'ba777777-7777-7777-7777-777777777777', departmentId: bcaDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-BCA-002', rollNo: '1HY25CA002', usn: 'USN-2025-CA-002', admYear: '2025', dob: '2007-08-04', gender: 'male', blood: 'B+', parent: 'R. Verma', parentPhone: '+91-9741900021', cgpa: 8.55 },

    // B.Tech Mech (Main Campus) - 2 Students
    { id: 22, email: 'chetan.bhagat@hitm.edu.in', firstName: 'Chetan', lastName: 'Gowda', phone: '+91-9741000022', courseId: cMainMechId, batchId: 'ba888888-8888-8888-8888-888888888888', departmentId: mechDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ME-001', rollNo: '1HY25ME001', usn: 'USN-2025-ME-001', admYear: '2025', dob: '2007-01-10', gender: 'male', blood: 'A+', parent: 'Shiva Gowda', parentPhone: '+91-9741900022', cgpa: 8.15 },
    { id: 23, email: 'neha.dhupia@hitm.edu.in', firstName: 'Neha', lastName: 'Kulkarni', phone: '+91-9741000023', courseId: cMainMechId, batchId: 'ba888888-8888-8888-8888-888888888888', departmentId: mechDeptId, branchId: mainCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ME-002', rollNo: '1HY25ME002', usn: 'USN-2025-ME-002', admYear: '2025', dob: '2007-06-25', gender: 'female', blood: 'B+', parent: 'S. Kulkarni', parentPhone: '+91-9741900023', cgpa: 8.60 },

    // Electronic City Campus - 5 Students
    { id: 24, email: 'vishal.ec@hitm.edu.in', firstName: 'Vishal', lastName: 'Chopra', phone: '+91-9741000024', courseId: cEcCseId, batchId: 'ba999999-9999-9999-9999-999999999999', departmentId: cseDeptId, branchId: ecCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ECCSE-001', rollNo: '1HY25EC-CS01', usn: 'USN-2025-EC-CS01', admYear: '2025', dob: '2007-04-03', gender: 'male', blood: 'O+', parent: 'Naresh Chopra', parentPhone: '+91-9741900024', cgpa: 8.70 },
    { id: 25, email: 'simran.kaur@hitm.edu.in', firstName: 'Simran', lastName: 'Kaur', phone: '+91-9741000025', courseId: cEcCseId, batchId: 'ba999999-9999-9999-9999-999999999999', departmentId: cseDeptId, branchId: ecCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ECCSE-002', rollNo: '1HY25EC-CS02', usn: 'USN-2025-EC-CS02', admYear: '2025', dob: '2007-09-15', gender: 'female', blood: 'A+', parent: 'Gurpreet Singh', parentPhone: '+91-9741900025', cgpa: 9.25 },
    { id: 26, email: 'pranav.ds@hitm.edu.in', firstName: 'Pranav', lastName: 'Mohan', phone: '+91-9741000026', courseId: cEcAimlId, batchId: 'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', departmentId: aimlDeptId, branchId: ecCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-ECDS-001', rollNo: '1HY25EC-DS01', usn: 'USN-2025-EC-DS01', admYear: '2025', dob: '2007-11-19', gender: 'male', blood: 'B+', parent: 'Mohan Lal', parentPhone: '+91-9741900026', cgpa: 9.10 },
    { id: 27, email: 'kavya.iot@hitm.edu.in', firstName: 'Kavya', lastName: 'Suresh', phone: '+91-9741000027', courseId: cEcEceId, batchId: 'babbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', departmentId: eceDeptId, branchId: ecCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-ECIOT-001', rollNo: '1HY26EC-IOT01', usn: 'USN-2026-EC-IOT01', admYear: '2026', dob: '2008-01-29', gender: 'female', blood: 'O+', parent: 'Suresh Babu', parentPhone: '+91-9741900027', cgpa: 8.80 },
    { id: 28, email: 'sanjay.sec@hitm.edu.in', firstName: 'Sanjay', lastName: 'Dutt', phone: '+91-9741000028', courseId: cEcBcaId, batchId: 'bacccccc-cccc-cccc-cccc-cccccccccccc', departmentId: bcaDeptId, branchId: ecCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-ECBCA-001', rollNo: '1HY26EC-BCA01', usn: 'USN-2026-EC-BCA01', admYear: '2026', dob: '2008-05-12', gender: 'male', blood: 'AB+', parent: 'Sunil Dutt', parentPhone: '+91-9741900028', cgpa: 8.40 },

    // Whitefield Campus - 4 Students
    { id: 29, email: 'abhishek.spe@hitm.edu.in', firstName: 'Abhishek', lastName: 'Bachchan', phone: '+91-9741000029', courseId: cWfCseId, batchId: 'badddddd-dddd-dddd-dddd-dddddddddddd', departmentId: cseDeptId, branchId: wfCampusId, semester: 3, section: 'A', admNo: 'ADM-2025-WFSPE-001', rollNo: '1HY25WF-SPE01', usn: 'USN-2025-WF-SPE01', admYear: '2025', dob: '2007-02-05', gender: 'male', blood: 'A+', parent: 'Amitabh Bachchan', parentPhone: '+91-9741900029', cgpa: 9.30 },
    { id: 30, email: 'ritika.mba@hitm.edu.in', firstName: 'Ritika', lastName: 'Sajdeh', phone: '+91-9741000030', courseId: cWfMbaId, batchId: 'baffffff-ffff-ffff-ffff-ffffffffffff', departmentId: mbaDeptId, branchId: wfCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-WFMBA-001', rollNo: '1HY26WF-MBA01', usn: 'USN-2026-WF-MBA01', admYear: '2026', dob: '2003-09-18', gender: 'female', blood: 'O+', parent: 'Bobby Sajdeh', parentPhone: '+91-9741900030', cgpa: 9.45 },
    { id: 31, email: 'gautam.mba@hitm.edu.in', firstName: 'Gautam', lastName: 'Gambhir', phone: '+91-9741000031', courseId: cWfMbaId, batchId: 'baffffff-ffff-ffff-ffff-ffffffffffff', departmentId: mbaDeptId, branchId: wfCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-WFMBA-002', rollNo: '1HY26WF-MBA02', usn: 'USN-2026-WF-MBA02', admYear: '2026', dob: '2002-10-14', gender: 'male', blood: 'B+', parent: 'Deepak Gambhir', parentPhone: '+91-9741900031', cgpa: 8.90 },
    { id: 32, email: 'shriya.ai@hitm.edu.in', firstName: 'Shriya', lastName: 'Saran', phone: '+91-9741000032', courseId: cWfAimlId, batchId: 'baeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', departmentId: aimlDeptId, branchId: wfCampusId, semester: 1, section: 'A', admNo: 'ADM-2026-WFAI-001', rollNo: '1HY26WF-AI01', usn: 'USN-2026-WF-AI01', admYear: '2026', dob: '2008-04-08', gender: 'female', blood: 'O-', parent: 'Pushpendra Saran', parentPhone: '+91-9741900032', cgpa: 8.85 },
  ];

  const studentCreatedMap = new Map<number, { userId: string; studentId: string; courseId: string; batchId: string }>();

  for (const st of rawStudents) {
    const uId = generateId('usr', st.id);
    const sId = generateId('stu', st.id);

    const user = await prisma.user.upsert({
      where: { id: uId },
      update: {
        email: st.email,
        firstName: st.firstName,
        lastName: st.lastName,
        phone: st.phone,
        status: 'active',
      },
      create: {
        id: uId,
        academyId,
        email: st.email,
        passwordHash: studentPassword,
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

    const studentRecord = await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        courseId: st.courseId,
        batchId: st.batchId,
        departmentId: st.departmentId,
        branchId: st.branchId,
        semester: st.semester,
        section: st.section,
        rollNumber: st.rollNo,
        universityRegNumber: st.usn,
        admissionYear: st.admYear,
        parentName: st.parent,
        parentPhone: st.parentPhone,
        parentEmail: `${st.firstName.toLowerCase()}.${st.lastName.toLowerCase()}.parent@gmail.com`,
      },
      create: {
        id: sId,
        academyId,
        branchId: st.branchId,
        userId: user.id,
        courseId: st.courseId,
        batchId: st.batchId,
        departmentId: st.departmentId,
        semester: st.semester,
        section: st.section,
        admissionNumber: st.admNo,
        rollNumber: st.rollNo,
        universityRegNumber: st.usn,
        admissionYear: st.admYear,
        admissionDate: new Date(`${st.admYear}-08-01`),
        dateOfBirth: new Date(st.dob),
        gender: st.gender,
        bloodGroup: st.blood,
        parentName: st.parent,
        parentPhone: st.parentPhone,
        parentEmail: `${st.firstName.toLowerCase()}.${st.lastName.toLowerCase()}.parent@gmail.com`,
        studentStatus: 'active',
      },
    });

    studentCreatedMap.set(st.id, {
      userId: user.id,
      studentId: studentRecord.id,
      courseId: st.courseId,
      batchId: st.batchId,
    });

    // Semester Grades
    if (st.semester >= 3) {
      await prisma.studentSemesterGrade.upsert({
        where: { uq_student_semester_grade: { studentId: studentRecord.id, semester: 1 } },
        update: { sgpa: Number(st.cgpa) - 0.15, cgpa: Number(st.cgpa) - 0.15 },
        create: {
          academyId,
          studentId: studentRecord.id,
          courseId: st.courseId,
          semester: 1,
          academicYear: '2025-26',
          sgpa: Number(st.cgpa) - 0.15,
          cgpa: Number(st.cgpa) - 0.15,
          totalCreditsEarned: 20,
          backlogsCount: 0,
          status: 'passed',
        },
      });

      await prisma.studentSemesterGrade.upsert({
        where: { uq_student_semester_grade: { studentId: studentRecord.id, semester: 2 } },
        update: { sgpa: Number(st.cgpa) + 0.10, cgpa: st.cgpa },
        create: {
          academyId,
          studentId: studentRecord.id,
          courseId: st.courseId,
          semester: 2,
          academicYear: '2025-26',
          sgpa: Number(st.cgpa) + 0.10,
          cgpa: st.cgpa,
          totalCreditsEarned: 22,
          backlogsCount: 0,
          status: 'passed',
        },
      });
    }
  }

  // =========================================================================
  // 11. ATTENDANCE SESSIONS & STUDENT RECORDS
  // =========================================================================
  console.log('📊 11. Seeding Attendance Records across batches...');
  const attendanceSessions = [
    { id: '81613b8c-f2e0-5be3-0c3c-e010f5a86675', branchId: mainCampusId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: '33a4cbb8-7491-352c-18dc-13843d8bfc30', teacherId: 'fc111111-1111-1111-1111-111111111111', date: new Date('2026-09-22'), total: 4, present: 4, absent: 0, studentIds: [1, 2, 3, 4] },
    { id: 'e663d177-66e1-da21-efc0-192a399bdb2b', branchId: mainCampusId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: '612954d7-d790-f7de-585e-502644774255', teacherId: 'fc111111-1111-1111-1111-111111111111', date: new Date('2026-09-23'), total: 4, present: 3, absent: 1, studentIds: [1, 2, 3, 4], absentStudentId: 3 },
    { id: '9b5f55c7-0a9b-fe3b-0b5a-9df39a4b8c96', branchId: mainCampusId, batchId: 'ba111111-1111-1111-1111-111111111111', subjectId: 'f86ba37d-5f57-ad61-04c9-a9761e0e4555', teacherId: 'fc999999-9999-9999-9999-999999999999', date: new Date('2026-09-24'), total: 4, present: 4, absent: 0, studentIds: [1, 2, 3, 4] },
    { id: 'ae805529-36f3-33da-dcbf-9ceefceffbef', branchId: mainCampusId, batchId: 'ba333333-3333-3333-3333-333333333333', subjectId: '9f6aca1d-e8bb-2b51-9317-11275cbf2881', teacherId: 'fc222222-2222-2222-2222-222222222222', date: new Date('2026-09-22'), total: 4, present: 4, absent: 0, studentIds: [7, 8, 9, 10] },
    { id: '69427d33-fd52-e888-219a-6ae132ce4087', branchId: mainCampusId, batchId: 'ba555555-5555-5555-5555-555555555555', subjectId: 'ea7f31ff-5957-b3e5-54f4-73a7f522923b', teacherId: 'fc444444-4444-4444-4444-444444444444', date: new Date('2026-09-23'), total: 3, present: 3, absent: 0, studentIds: [14, 15, 16] },
    { id: 'e2f3df2e-857c-c37c-5c55-008638f41d60', branchId: mainCampusId, batchId: 'ba666666-6666-6666-6666-666666666666', subjectId: 'c63c45ac-3025-715b-e55e-69b2306ee35a', teacherId: 'fc555555-5555-5555-5555-555555555555', date: new Date('2026-09-24'), total: 3, present: 3, absent: 0, studentIds: [17, 18, 19] },
    { id: '30a54ba4-9b6c-beca-92fa-cc44ba73e209', branchId: ecCampusId, batchId: 'ba999999-9999-9999-9999-999999999999', subjectId: '3b83e6e8-7c93-bcc9-59cc-f6546e705875', teacherId: 'fc111111-1111-1111-1111-111111111111', date: new Date('2026-09-24'), total: 2, present: 2, absent: 0, studentIds: [24, 25] },
  ];

  for (const att of attendanceSessions) {
    await prisma.attendance.upsert({
      where: { id: att.id },
      update: {
        totalStudents: att.total,
        presentCount: att.present,
        absentCount: att.absent,
      },
      create: {
        id: att.id,
        academyId,
        branchId: att.branchId,
        batchId: att.batchId,
        subjectId: att.subjectId,
        teacherId: att.teacherId,
        date: att.date,
        totalStudents: att.total,
        presentCount: att.present,
        absentCount: att.absent,
      },
    });

    for (const sNum of att.studentIds) {
      const stuInfo = studentCreatedMap.get(sNum);
      if (!stuInfo) continue;
      const isAbsent = (att as any).absentStudentId === sNum;

      await prisma.attendanceRecord.upsert({
        where: { uq_attendance_record: { attendanceId: att.id, studentId: stuInfo.studentId } },
        update: { status: isAbsent ? 'absent' : 'present' },
        create: {
          attendanceId: att.id,
          studentId: stuInfo.studentId,
          status: isAbsent ? 'absent' : 'present',
          remarks: isAbsent ? 'Medical Leave Submitted' : 'Present in class',
        },
      });
    }
  }

  // =========================================================================
  // 12. EXAMINATIONS, PAPERS & EXAM RESULTS
  // =========================================================================
  console.log('📝 12. Seeding Exams, Papers & Results...');
  const examCie1Id = 'b81f5168-24c7-03fe-37a3-9580ce8240da';
  const examSeeId = 'd7bbe521-9873-4662-0b8a-d3ce6ea9cb86';

  await prisma.exam.upsert({
    where: { id: examCie1Id },
    update: { name: 'Continuous Internal Evaluation (CIE-1)', examType: 'mid_term' },
    create: {
      id: examCie1Id,
      academyId,
      name: 'Continuous Internal Evaluation (CIE-1)',
      description: 'Mid-term continuous evaluation for all engineering & degree programs.',
      examType: 'mid_term',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-10'),
    },
  });

  await prisma.exam.upsert({
    where: { id: examSeeId },
    update: { name: 'Semester End Examination (SEE) - Autonomous', examType: 'final' },
    create: {
      id: examSeeId,
      academyId,
      name: 'Semester End Examination (SEE) - Autonomous',
      description: 'End semester final theory and practical evaluations.',
      examType: 'final',
      startDate: new Date('2026-12-10'),
      endDate: new Date('2026-12-28'),
    },
  });

  // Exam Papers
  const examPapersData = [
    { id: '1a0e19d1-6a22-8501-2f50-82a8100c3fa6', examId: examCie1Id, subjectId: '33a4cbb8-7491-352c-18dc-13843d8bfc30', batchId: 'ba111111-1111-1111-1111-111111111111', date: new Date('2026-09-02'), startTime: '09:30', duration: 90, maxMarks: 50, passMarks: 20, students: [1, 2, 3, 4], marks: [46.5, 48.0, 42.0, 49.5] },
    { id: 'b8791f8d-b7a3-9b15-7dc3-a8b4736b3c26', examId: examCie1Id, subjectId: '612954d7-d790-f7de-585e-502644774255', batchId: 'ba111111-1111-1111-1111-111111111111', date: new Date('2026-09-04'), startTime: '09:30', duration: 90, maxMarks: 50, passMarks: 20, students: [1, 2, 3, 4], marks: [44.0, 47.5, 39.5, 48.0] },
    { id: '95dcf09e-a72b-0cd8-2a17-7a6365c3ff76', examId: examCie1Id, subjectId: '9f6aca1d-e8bb-2b51-9317-11275cbf2881', batchId: 'ba333333-3333-3333-3333-333333333333', date: new Date('2026-09-02'), startTime: '09:30', duration: 90, maxMarks: 50, passMarks: 20, students: [7, 8, 9, 10], marks: [45.0, 41.5, 47.0, 43.0] },
    { id: '54c4c5d1-e1be-f825-48f4-0a77f1f639b3', examId: examCie1Id, subjectId: 'ea7f31ff-5957-b3e5-54f4-73a7f522923b', batchId: 'ba555555-5555-5555-5555-555555555555', date: new Date('2026-09-03'), startTime: '09:30', duration: 90, maxMarks: 50, passMarks: 20, students: [14, 15, 16], marks: [48.0, 45.5, 42.0] },
    { id: 'a0991a3d-eee1-baf9-a6f0-d340d30db741', examId: examCie1Id, subjectId: 'c63c45ac-3025-715b-e55e-69b2306ee35a', batchId: 'ba666666-6666-6666-6666-666666666666', date: new Date('2026-09-05'), startTime: '09:30', duration: 90, maxMarks: 50, passMarks: 20, students: [17, 18, 19], marks: [43.5, 46.0, 41.0] },
  ];

  for (const ep of examPapersData) {
    await prisma.examPaper.upsert({
      where: { id: ep.id },
      update: {
        maxMarks: ep.maxMarks,
        passingMarks: ep.passMarks,
        durationMinutes: ep.duration,
      },
      create: {
        id: ep.id,
        academyId,
        examId: ep.examId,
        subjectId: ep.subjectId,
        batchId: ep.batchId,
        examDate: ep.date,
        startTime: ep.startTime,
        durationMinutes: ep.duration,
        maxMarks: ep.maxMarks,
        passingMarks: ep.passMarks,
      },
    });

    for (let idx = 0; idx < ep.students.length; idx++) {
      const sNum = ep.students[idx];
      const marks = ep.marks[idx];
      const stuInfo = studentCreatedMap.get(sNum);
      if (!stuInfo) continue;

      await prisma.examResult.upsert({
        where: { uq_exam_result: { examPaperId: ep.id, studentId: stuInfo.studentId } },
        update: {
          marksObtained: marks,
          status: marks >= ep.passMarks ? 'pass' : 'fail',
          remarks: `CIE Score: ${marks}/${ep.maxMarks} (${marks >= 45 ? 'Grade O' : 'Grade A+'})`,
        },
        create: {
          academyId,
          examPaperId: ep.id,
          studentId: stuInfo.studentId,
          marksObtained: marks,
          status: marks >= ep.passMarks ? 'pass' : 'fail',
          remarks: `CIE Score: ${marks}/${ep.maxMarks} (${marks >= 45 ? 'Grade O' : 'Grade A+'})`,
          gradedBy: adminUserId,
        },
      });
    }
  }

  // =========================================================================
  // 13. FEE STRUCTURES, ALLOCATIONS & PAYMENTS (Finance Module)
  // =========================================================================
  console.log('💳 13. Seeding Fee Structures, Allocations & Payments...');
  const feeCseTuitionId = '25f89f7e-dd4a-5f8e-f05b-ba1d6d70006b';
  const feeCseLabId = '504d43bc-9520-5ff3-ddd6-70613dec84e6';
  const feeBbaTuitionId = '2aed020b-a116-8222-8848-82f9c862ec0e';
  const feeMbaTuitionId = '7ee1619f-dcca-15de-d952-b61cb7b401c3';
  const feeHostelId = 'b896a1e3-bce2-536e-ad93-690e558f76d6';
  const feeTransportId = 'c883533b-c20a-da36-e488-c8b5b63839ae';

  const feeStructuresData = [
    { id: feeCseTuitionId, name: 'B.Tech Annual Academic Tuition Fee', amount: 110000.00, frequency: 'annual', description: 'Comprehensive academic tuition, university registration, and digital library fee.' },
    { id: feeCseLabId, name: 'AI & Cloud Infrastructure Lab Fee', amount: 15000.00, frequency: 'annual', description: 'Access to high performance GPU compute, AWS credits, and specialized software licenses.' },
    { id: feeBbaTuitionId, name: 'BBA Honors Academic Tuition Fee', amount: 65000.00, frequency: 'annual', description: 'Business school tuition, Harvard Business Publishing case study access, and corporate immersion.' },
    { id: feeMbaTuitionId, name: 'Executive MBA Tuition & Immersion Fee', amount: 175000.00, frequency: 'annual', description: 'Executive leadership modules, international immersion, and mentorship.' },
    { id: feeHostelId, name: 'Campus Executive Hostel & Mess Fee', amount: 75000.00, frequency: 'annual', description: 'Twin-sharing AC accommodation with 4-meal curated dining and high-speed Wi-Fi.' },
    { id: feeTransportId, name: 'Campus Air-Conditioned Bus Shuttle', amount: 24000.00, frequency: 'annual', description: 'Daily AC transport spanning Bangalore city routes to all campus gates.' },
  ];

  for (const fs of feeStructuresData) {
    await prisma.feeStructure.upsert({
      where: { id: fs.id },
      update: {
        name: fs.name,
        amount: fs.amount,
        frequency: fs.frequency,
        description: fs.description,
      },
      create: {
        id: fs.id,
        academyId,
        name: fs.name,
        amount: fs.amount,
        frequency: fs.frequency,
        description: fs.description,
      },
    });
  }

  // Allocate fees to all students
  let receiptCounter = 1001;
  for (let sId = 1; sId <= rawStudents.length; sId++) {
    const stuInfo = studentCreatedMap.get(sId);
    if (!stuInfo) continue;
    const stRaw = rawStudents[sId - 1];

    let structId = feeCseTuitionId;
    let baseAmount = 125000.00;
    if (stRaw.courseId === cMainBbaId) {
      structId = feeBbaTuitionId;
      baseAmount = 65000.00;
    } else if (stRaw.courseId === cWfMbaId) {
      structId = feeMbaTuitionId;
      baseAmount = 175000.00;
    }

    // Diverse payment status across students
    let paidAmt = 0;
    let status = 'unpaid';
    if (sId % 3 === 1) {
      paidAmt = baseAmount;
      status = 'paid';
    } else if (sId % 3 === 2) {
      paidAmt = baseAmount / 2;
      status = 'partially_paid';
    } else {
      paidAmt = 0;
      status = 'unpaid';
    }

    const allocId = generateId('alc', sId);
    await prisma.feeAllocation.upsert({
      where: { id: allocId },
      update: {
        totalAmount: baseAmount,
        paidAmount: paidAmt,
        status: status,
      },
      create: {
        id: allocId,
        academyId,
        studentId: stuInfo.studentId,
        feeStructureId: structId,
        dueDate: new Date('2026-10-31'),
        totalAmount: baseAmount,
        paidAmount: paidAmt,
        status: status,
      },
    });

    if (paidAmt > 0) {
      const payId = generateId('pay', sId);
      const receiptNo = `REC-2026-${receiptCounter++}`;
      const paymentModes = ['UPI', 'NetBanking', 'Credit Card', 'HDFC Payment Gateway'];
      const mode = paymentModes[sId % paymentModes.length];

      await prisma.payment.upsert({
        where: { id: payId },
        update: { amountPaid: paidAmt },
        create: {
          id: payId,
          academyId,
          feeAllocationId: allocId,
          amountPaid: paidAmt,
          receiptNumber: receiptNo,
          paymentMode: mode,
          referenceNo: `TXN-HYV-${receiptNo}-${sId}99A`,
          paymentDate: new Date('2026-08-15'),
          remarks: status === 'paid' ? 'Full annual tuition paid in single transaction.' : 'First installment (50%) paid via student portal.',
          recordedBy: adminUserId,
        },
      });
    }
  }

  // =========================================================================
  // 14. PLACEMENT DRIVES & STUDENT OFFERS (Placements Module)
  // =========================================================================
  console.log('💼 14. Seeding Placement Drives & Student Offers...');
  const placementDrivesData = [
    { id: '34536c37-afe5-8ee9-aa86-e7d308b283e4', company: 'Google India', role: 'Software Engineer - Distributed Systems', package: 42.50, criteria: 'B.Tech CSE/ISE/AIML with CGPA >= 8.5, no active backlogs.', date: new Date('2026-10-15'), deadline: new Date('2026-10-05'), location: 'Google Bangalore & Online', type: 'Full-time', status: 'open' },
    { id: 'e9cfd57d-ddae-8ff0-9241-5280a4ffe596', company: 'Microsoft India (R&D)', role: 'Software Development Engineer I (Azure)', package: 38.00, criteria: 'B.Tech with strong DSA and system design background.', date: new Date('2026-10-22'), deadline: new Date('2026-10-12'), location: 'Microsoft Campus, Bellandur, Bangalore', type: 'Full-time', status: 'open' },
    { id: '6bc540b8-cdc5-c1e3-7456-d091a52878c2', company: 'Amazon AWS Cloud', role: 'Cloud Support Engineer & DevOps', package: 26.50, criteria: 'Engineering and BCA graduates with CGPA >= 7.5.', date: new Date('2026-10-28'), deadline: new Date('2026-10-18'), location: 'HITM Main Auditorium', type: 'Full-time', status: 'open' },
    { id: '328279f0-194b-b449-861a-f1d4c8610787', company: 'Tata Consultancy Services (TCS Digital)', role: 'Digital System Specialist', package: 9.00, criteria: 'All engineering disciplines with CGPA >= 7.0.', date: new Date('2026-11-05'), deadline: new Date('2026-10-25'), location: 'HITM Electronic City Campus', type: 'Full-time', status: 'open' },
    { id: '2f058aee-7c4e-56cd-1414-d0a859b49fd1', company: 'Infosys BPM & Tech Services', role: 'Specialist Programmer (Power Programmer)', package: 9.50, criteria: 'B.Tech / BCA with CGPA >= 7.5.', date: new Date('2026-11-12'), deadline: new Date('2026-11-01'), location: 'Infosys Global Education Center', type: 'Full-time', status: 'open' },
    { id: 'a9299f91-0a30-9a1e-b1dc-3c020088e451', company: 'Deloitte Consulting India', role: 'Business Technology Analyst', package: 12.00, criteria: 'Engineering and BBA/MBA graduates with CGPA >= 7.0.', date: new Date('2026-11-18'), deadline: new Date('2026-11-08'), location: 'HITM Whitefield Campus', type: 'Full-time', status: 'open' },
    { id: 'f7fda8db-8b67-99ac-6dc0-ae22f99056ec', company: 'Goldman Sachs', role: 'Financial Analyst & Operations', package: 18.00, criteria: 'BBA & MBA candidates with high quantitative aptitude.', date: new Date('2026-11-25'), deadline: new Date('2026-11-15'), location: 'HITM Main Auditorium', type: 'Full-time', status: 'open' },
    { id: 'a13c2150-9f07-586e-cd45-92f767b82c34', company: 'Accenture Strategy & AI', role: 'Associate AI Developer', package: 8.50, criteria: 'B.Tech CSE/AIML/ECE with CGPA >= 6.5.', date: new Date('2026-12-02'), deadline: new Date('2026-11-20'), location: 'HITM Main Campus', type: 'Full-time', status: 'open' },
  ];

  for (const pd of placementDrivesData) {
    await prisma.placementDrive.upsert({
      where: { id: pd.id },
      update: {
        companyName: pd.company,
        jobRole: pd.role,
        packageLpa: pd.package,
        eligibilityCriteria: pd.criteria,
        driveDate: pd.date,
        deadlineDate: pd.deadline,
        location: pd.location,
        jobType: pd.type,
        status: pd.status,
      },
      create: {
        id: pd.id,
        academyId,
        companyName: pd.company,
        jobRole: pd.role,
        packageLpa: pd.package,
        eligibilityCriteria: pd.criteria,
        driveDate: pd.date,
        deadlineDate: pd.deadline,
        location: pd.location,
        jobType: pd.type,
        status: pd.status,
      },
    });
  }

  // Student Applications for Drives
  const applications = [
    { id: '4c78fa20-50b6-a074-6895-89ef19b02ccb', driveId: '34536c37-afe5-8ee9-aa86-e7d308b283e4', sNum: 1, status: 'shortlisted', remarks: 'Cleared online coding round with 100% test cases.' },
    { id: '264576ca-6419-38b7-1465-1f973b9f737f', driveId: '34536c37-afe5-8ee9-aa86-e7d308b283e4', sNum: 2, status: 'offered', remarks: 'Offered full-time position @ ₹42.5 LPA! Offer letter issued.' },
    { id: 'af02d56d-6c5c-eeb9-c7b3-0eb798cf12a6', driveId: 'e9cfd57d-ddae-8ff0-9241-5280a4ffe596', sNum: 4, status: 'offered', remarks: 'Offered SDE-1 Azure position @ ₹38 LPA.' },
    { id: '85b0b6b9-6e53-e6bd-2d20-089bd25972c7', driveId: '6bc540b8-cdc5-c1e3-7456-d091a52878c2', sNum: 7, status: 'shortlisted', remarks: 'Cleared Technical Interview Round 1.' },
    { id: '34a8408a-d93f-6a77-403f-a91a1819f7ef', driveId: '328279f0-194b-b449-861a-f1d4c8610787', sNum: 3, status: 'applied', remarks: 'Application under verification by placement cell.' },
    { id: '6c94c8ea-80d5-231e-f727-47462ebfb1bf', driveId: '2f058aee-7c4e-56cd-1414-d0a859b49fd1', sNum: 20, status: 'shortlisted', remarks: 'Selected for final HR round.' },
    { id: '0842ca66-3d90-e28e-9ad7-5a2d2efcd9b0', driveId: 'a9299f91-0a30-9a1e-b1dc-3c020088e451', sNum: 17, status: 'offered', remarks: 'Offered Business Tech Analyst position @ ₹12 LPA.' },
    { id: '86e26316-23e7-615a-896a-71b62942d725', driveId: 'f7fda8db-8b67-99ac-6dc0-ae22f99056ec', sNum: 30, status: 'offered', remarks: 'Offered Financial Operations Specialist @ ₹18 LPA.' },
  ];

  for (const app of applications) {
    const stuInfo = studentCreatedMap.get(app.sNum);
    if (!stuInfo) continue;

    await prisma.studentPlacement.upsert({
      where: { id: app.id },
      update: { status: app.status, remarks: app.remarks },
      create: {
        id: app.id,
        academyId,
        driveId: app.driveId,
        studentId: stuInfo.studentId,
        status: app.status,
        remarks: app.remarks,
      },
    });
  }

  // =========================================================================
  // 15. INTERNSHIP RECORDS (Internships Module)
  // =========================================================================
  console.log('🔬 15. Seeding Industry Internships...');
  const internshipsData = [
    { id: '0378a72e-8a96-90ca-b649-1f734179b571', sNum: 1, teacherId: 'fc111111-1111-1111-1111-111111111111', company: 'Google Summer of Code (CNCF)', role: 'Kubernetes Core Contributor Intern', stipend: 50000, start: '2026-05-01', end: '2026-08-31', status: 'completed', cert: 'https://verify.cncf.io/gsoc2026-arjun' },
    { id: '8c5f8217-86a7-2b29-de4c-6077034dd267', sNum: 2, teacherId: 'fc111111-1111-1111-1111-111111111111', company: 'Microsoft Research India', role: 'AI Systems Research Intern', stipend: 45000, start: '2026-06-01', end: '2026-11-30', status: 'active', cert: 'https://msr.microsoft.com/intern/priya-patel' },
    { id: '88552d09-f426-7383-e2d6-2118793d427f', sNum: 7, teacherId: 'fc222222-2222-2222-2222-222222222222', company: 'Infosys Springboard Labs', role: 'Full Stack & Cloud Architecture Intern', stipend: 25000, start: '2026-06-01', end: '2026-09-30', status: 'completed', cert: 'https://springboard.infosys.com/verify/sneha' },
    { id: '0bef6141-8e9f-b862-e3d4-b9542112eaba', sNum: 14, teacherId: 'fc444444-4444-4444-4444-444444444444', company: 'Samsung PRISM R&D', role: 'Computer Vision & On-Device ML Intern', stipend: 35000, start: '2026-05-15', end: '2026-11-15', status: 'active', cert: 'https://samsungprism.in/cert/nikhil-sinha' },
    { id: '45a1e665-0f3e-6747-d670-ce5b489a737f', sNum: 17, teacherId: 'fc555555-5555-5555-5555-555555555555', company: 'KPMG India Advisory', role: 'Corporate Finance & Risk Consulting Intern', stipend: 30000, start: '2026-06-01', end: '2026-08-31', status: 'completed', cert: 'https://kpmg.in/internship/rahul-sharma' },
    { id: '1bcf2497-42ff-5626-47dd-3560bb5e95b4', sNum: 24, teacherId: 'fc111111-1111-1111-1111-111111111111', company: 'AWS Cloud Center of Excellence', role: 'DevOps & Site Reliability Intern', stipend: 32000, start: '2026-07-01', end: '2026-12-31', status: 'active', cert: 'https://aws.amazon.com/verify/vishal-chopra' },
  ];

  for (const intern of internshipsData) {
    const stuInfo = studentCreatedMap.get(intern.sNum);
    if (!stuInfo) continue;

    await prisma.internshipRecord.upsert({
      where: { id: intern.id },
      update: {
        companyName: intern.company,
        role: intern.role,
        stipend: intern.stipend,
        status: intern.status,
      },
      create: {
        id: intern.id,
        academyId,
        studentId: stuInfo.studentId,
        teacherId: intern.teacherId,
        companyName: intern.company,
        role: intern.role,
        stipend: intern.stipend,
        startDate: new Date(intern.start),
        endDate: new Date(intern.end),
        status: intern.status,
        certificateUrl: intern.cert,
      },
    });
  }

  // =========================================================================
  // 16. LIBRARY BOOKS & ISSUED LOGS (Library Module)
  // =========================================================================
  console.log('📚 16. Seeding Library Books & Issue History...');
  const booksData = [
    { id: 'eea4176a-2a80-6f01-51de-29e3f7316829', title: 'Introduction to Algorithms (4th Edition)', author: 'Thomas H. Cormen, Charles Leiserson, Ronald Rivest', isbn: '978-0262046305', category: 'Computer Science', publisher: 'MIT Press', deptId: cseDeptId, total: 35, available: 31, shelf: 'Stack CS-Row 1-A' },
    { id: '4181a360-a188-8630-d66e-9b6e992743fd', title: 'Database System Concepts (7th Edition)', author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan', isbn: '978-0078022159', category: 'Database Systems', publisher: 'McGraw-Hill', deptId: cseDeptId, total: 30, available: 26, shelf: 'Stack CS-Row 2-B' },
    { id: '9be3a2f9-793c-676f-2c4e-977c09f8b245', title: 'Operating System Concepts (10th Edition)', author: 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne', isbn: '978-1119800361', category: 'Operating Systems', publisher: 'Wiley', deptId: cseDeptId, total: 28, available: 24, shelf: 'Stack CS-Row 3-C' },
    { id: 'eec1649f-129c-5801-cb78-98a2b036906f', title: 'Deep Learning with Python', author: 'François Chollet', isbn: '978-1617296864', category: 'Artificial Intelligence', publisher: 'Manning Publications', deptId: aimlDeptId, total: 25, available: 22, shelf: 'Stack AI-Row 1-A' },
    { id: '365c92ca-8c97-a08f-c4a6-c5db23e39e25', title: 'Digital Design: With an Introduction to Verilog HDL', author: 'M. Morris Mano, Michael D. Ciletti', isbn: '978-0132774208', category: 'Electronics & VLSI', publisher: 'Pearson', deptId: eceDeptId, total: 20, available: 17, shelf: 'Stack EC-Row 1-B' },
    { id: '4b440e0d-aed4-4b92-f260-d1bf35f3243f', title: 'Corporate Finance (12th Edition)', author: 'Stephen Ross, Randolph Westerfield, Jeffrey Jaffe', isbn: '978-1259918940', category: 'Management & Finance', publisher: 'McGraw-Hill', deptId: bbaDeptId, total: 22, available: 19, shelf: 'Stack MGMT-Row 1-A' },
    { id: '3634135d-7511-b43c-0f7f-e915179e1f4a', title: 'Clean Code: A Handbook of Agile Software Craftsmanship', author: 'Robert C. Martin ("Uncle Bob")', isbn: '978-0132350884', category: 'Software Engineering', publisher: 'Prentice Hall', deptId: cseDeptId, total: 25, available: 20, shelf: 'Stack CS-Row 4-D' },
    { id: '3ff405cc-1425-cb12-91d3-b9e02cad14d1', title: 'Design Patterns: Elements of Reusable Object-Oriented Software', author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides', isbn: '978-0201633610', category: 'Software Architecture', publisher: 'Addison-Wesley', deptId: cseDeptId, total: 18, available: 15, shelf: 'Stack CS-Row 5-E' },
    { id: 'e694c4fe-a4e2-0b78-08dc-f5330f8128f3', title: 'Strategic Management: Concepts and Cases', author: 'Fred R. David, Forest R. David', isbn: '978-0134153971', category: 'Strategic Management', publisher: 'Pearson', deptId: mbaDeptId, total: 20, available: 18, shelf: 'Stack MBA-Row 1-A' },
    { id: '6f4efc14-dd88-2ee2-87a4-cdd69346aeb1', title: 'Signals and Systems (2nd Edition)', author: 'Alan V. Oppenheim, Alan S. Willsky', isbn: '978-0138147570', category: 'Signal Processing', publisher: 'Prentice Hall', deptId: eceDeptId, total: 22, available: 20, shelf: 'Stack EC-Row 2-C' },
  ];

  for (const bk of booksData) {
    await prisma.libraryBook.upsert({
      where: { id: bk.id },
      update: {
        title: bk.title,
        author: bk.author,
        isbn: bk.isbn,
        category: bk.category,
        publisher: bk.publisher,
        departmentId: bk.deptId,
        totalCopies: bk.total,
        availableCopies: bk.available,
        shelfLocation: bk.shelf,
      },
      create: {
        id: bk.id,
        academyId,
        departmentId: bk.deptId,
        title: bk.title,
        author: bk.author,
        isbn: bk.isbn,
        category: bk.category,
        publisher: bk.publisher,
        totalCopies: bk.total,
        availableCopies: bk.available,
        shelfLocation: bk.shelf,
        status: 'available',
      },
    });
  }

  // Active & Returned Book Issue Records
  const bookIssues = [
    { id: 'd59ec287-1a1e-3dd9-1b4f-5507848f202c', bookId: booksData[0].id, sNum: 1, issueDate: '2026-09-10', dueDate: '2026-10-10', status: 'issued', fine: 0 },
    { id: '9dfa7e42-b22f-0f0a-15ed-6373cb7f41de', bookId: booksData[1].id, sNum: 2, issueDate: '2026-09-12', dueDate: '2026-10-12', status: 'issued', fine: 0 },
    { id: '1674d1d2-c905-e8b5-d33d-6885e3fc0138', bookId: booksData[3].id, sNum: 14, issueDate: '2026-09-14', dueDate: '2026-10-14', status: 'issued', fine: 0 },
    { id: '8b8889e0-d679-40da-5fbf-8acd1519e391', bookId: booksData[5].id, sNum: 17, issueDate: '2026-09-01', dueDate: '2026-09-21', status: 'returned', returnDate: '2026-09-20', fine: 0 },
    { id: '6ae56183-2821-ca85-9196-932dff60592e', bookId: booksData[6].id, sNum: 7, issueDate: '2026-08-20', dueDate: '2026-09-10', status: 'returned', returnDate: '2026-09-12', fine: 20 },
  ];

  for (const bi of bookIssues) {
    const stuInfo = studentCreatedMap.get(bi.sNum);
    if (!stuInfo) continue;

    await prisma.bookIssueRecord.upsert({
      where: { id: bi.id },
      update: { status: bi.status },
      create: {
        id: bi.id,
        academyId,
        bookId: bi.bookId,
        studentId: stuInfo.studentId,
        issueDate: new Date(bi.issueDate),
        dueDate: new Date(bi.dueDate),
        returnDate: bi.returnDate ? new Date(bi.returnDate) : null,
        fineAmount: bi.fine,
        status: bi.status,
      },
    });
  }

  // =========================================================================
  // 17. LMS: STUDY MATERIALS & VIDEO LECTURES & ASSIGNMENTS
  // =========================================================================
  console.log('💻 17. Seeding LMS Materials, Video Lectures & Assignments...');
  const studyMat1Id = 'dcf4151d-c8a2-2812-fc39-e6d93a4bc6bf';
  const studyMat2Id = '1aaed4c6-f2d6-bf48-6588-d78b294d86dd';

  await prisma.studyMaterial.upsert({
    where: { id: studyMat1Id },
    update: {},
    create: {
      id: studyMat1Id,
      academyId,
      title: 'Module 1-3 Complete Notes: Advanced Data Structures & Dynamic Trees',
      description: 'Handcrafted faculty lecture notes covering AVL Trees, Red-Black Trees, Graph traversals and Trie algorithms.',
      subjectId: '33a4cbb8-7491-352c-18dc-13843d8bfc30',
      teacherId: 'fc111111-1111-1111-1111-111111111111',
      materialType: 'pdf',
      url: 'https://cdn.degree.hyvora.in/materials/cs301-module1-3-notes.pdf',
      accessLevel: 'batch_only',
    },
  });

  await prisma.studyMaterialBatch.upsert({
    where: { uq_study_material_batch: { studyMaterialId: studyMat1Id, batchId: 'ba111111-1111-1111-1111-111111111111' } },
    update: {},
    create: {
      academyId,
      studyMaterialId: studyMat1Id,
      batchId: 'ba111111-1111-1111-1111-111111111111',
    },
  });

  await prisma.studyMaterial.upsert({
    where: { id: studyMat2Id },
    update: {},
    create: {
      id: studyMat2Id,
      academyId,
      title: 'Database Management Systems: SQL Optimization & ACID Guide',
      description: 'Comprehensive query tuning notes, execution plans, and transaction isolation levels.',
      subjectId: '612954d7-d790-f7de-585e-502644774255',
      teacherId: 'fc111111-1111-1111-1111-111111111111',
      materialType: 'pdf',
      url: 'https://cdn.degree.hyvora.in/materials/cs302-sql-acid-guide.pdf',
      accessLevel: 'batch_only',
    },
  });

  await prisma.studyMaterialBatch.upsert({
    where: { uq_study_material_batch: { studyMaterialId: studyMat2Id, batchId: 'ba111111-1111-1111-1111-111111111111' } },
    update: {},
    create: {
      academyId,
      studyMaterialId: studyMat2Id,
      batchId: 'ba111111-1111-1111-1111-111111111111',
    },
  });

  // Video Lectures
  const videoLect1Id = 'd42e0980-29ff-171f-fa56-56fa452f86ce';
  await prisma.videoLecture.upsert({
    where: { id: videoLect1Id },
    update: {},
    create: {
      id: videoLect1Id,
      academyId,
      title: 'Lecture 04: Graph Algorithms – Dijkstra & Bellman-Ford Explained',
      description: 'Live studio recorded lecture with algorithmic proofs and Python code walk-through.',
      subjectId: '33a4cbb8-7491-352c-18dc-13843d8bfc30',
      teacherId: 'fc111111-1111-1111-1111-111111111111',
      externalVideoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      videoProvider: 'youtube',
      durationSeconds: 3240,
      accessLevel: 'batch_only',
    },
  });

  await prisma.videoLectureBatch.upsert({
    where: { uq_video_lecture_batch: { videoLectureId: videoLect1Id, batchId: 'ba111111-1111-1111-1111-111111111111' } },
    update: {},
    create: {
      academyId,
      videoLectureId: videoLect1Id,
      batchId: 'ba111111-1111-1111-1111-111111111111',
    },
  });

  // Assignments & Submissions
  const assign1Id = '996277c7-5f9f-cd14-ac49-3207f4c86fff';
  await prisma.assignment.upsert({
    where: { id: assign1Id },
    update: { maxMarks: 25.00 },
    create: {
      id: assign1Id,
      academyId,
      batchId: 'ba111111-1111-1111-1111-111111111111',
      subjectId: '33a4cbb8-7491-352c-18dc-13843d8bfc30',
      teacherId: 'fc111111-1111-1111-1111-111111111111',
      title: 'Programming Assignment 1: Self-Balancing Red-Black Tree Implementation',
      description: 'Implement a memory-safe Red-Black tree in C++ or Java with full deletion rotation algorithms and unit test cases.',
      maxMarks: 25.00,
      dueDate: new Date('2026-10-15T23:59:59Z'),
    },
  });

  // Student Submissions for Assignment
  const s1Info = studentCreatedMap.get(1);
  if (s1Info) {
    await prisma.assignmentSubmission.upsert({
      where: { uq_assignment_submission: { assignmentId: assign1Id, studentId: s1Info.studentId } },
      update: { marksObtained: 24.50, status: 'graded', submissionDate: new Date('2026-09-18') },
      create: {
        academyId,
        assignmentId: assign1Id,
        studentId: s1Info.studentId,
        submissionDate: new Date('2026-09-18'),
        studentRemarks: 'Implemented full insert/delete fixup with comprehensive GoogleTest suite.',
        status: 'graded',
        marksObtained: 24.50,
        teacherRemarks: 'Flawless pointer rotations and clean edge case handling. Outstanding work!',
        gradedBy: adminUserId,
        gradedAt: new Date('2026-09-20'),
      },
    });
  }

  const s2Info = studentCreatedMap.get(2);
  if (s2Info) {
    await prisma.assignmentSubmission.upsert({
      where: { uq_assignment_submission: { assignmentId: assign1Id, studentId: s2Info.studentId } },
      update: { marksObtained: 25.00, status: 'graded', submissionDate: new Date('2026-09-19') },
      create: {
        academyId,
        assignmentId: assign1Id,
        studentId: s2Info.studentId,
        submissionDate: new Date('2026-09-19'),
        studentRemarks: 'Red-Black tree written in Java 21 with benchmarks against java.util.TreeMap.',
        status: 'graded',
        marksObtained: 25.00,
        teacherRemarks: 'Excellent benchmarking and documentation. 25/25.',
        gradedBy: adminUserId,
        gradedAt: new Date('2026-09-21'),
      },
    });
  }

  // =========================================================================
  // 18. NOTIFICATIONS & TEMPLATES (Notification Center)
  // =========================================================================
  console.log('🔔 18. Seeding Notifications & Announcement Templates...');
  const notificationsData = [
    { id: '8690e97e-0fa7-248a-1120-b68afe10ff97', userId: adminUserId, title: 'Autonomous Degree Examination Schedule (CIE-1) Published', message: 'The official schedule for Continuous Internal Evaluation 1 for all branches has been released. Check Exam tab for hall allocations.', type: 'in_app' },
    { id: '6da3bd22-883a-1cce-f1d5-f0e977b1b7a5', userId: adminUserId, title: 'Google & Microsoft Campus Recruitment Drive Registration', message: 'Eligible final and pre-final year students can now apply for upcoming on-campus drives under Placements menu.', type: 'in_app' },
    { id: '62c59837-da32-657c-279d-b6344cdf71e0', userId: adminUserId, title: 'Fee Payment Reminders for Odd Semester 2026-27', message: 'Students with outstanding balance are requested to complete dues by October 31, 2026 to avoid examination clearance delays.', type: 'in_app' },
    { id: '21b55b87-75c9-50fb-a60d-464ae155da7f', userId: adminUserId, title: 'Hyvora Annual Hackathon "HYVORATHON 2026" Announced', message: 'Registrations are open for the 36-hour National Level Hackathon with ₹5,00,000 in cash prizes and incubator access.', type: 'in_app' },
  ];

  for (const n of notificationsData) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: { title: n.title, message: n.message },
      create: {
        id: n.id,
        academyId,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        status: 'sent',
      },
    });
  }

  // Notification Templates
  const templatesData = [
    { id: 'bf000001-0000-0000-0000-000000000001', name: 'ADMISSION_WELCOME_EMAIL', subject: 'Welcome to Hyvora Institute of Technology & Management', type: 'email', body: 'Dear {{student_name}}, congratulations on your admission to {{course_name}} at Hyvora Institute of Technology & Management! Your University Reg No is {{usn}}.' },
    { id: 'bf000002-0000-0000-0000-000000000002', name: 'FEE_PAYMENT_RECEIPT_SMS', subject: 'Fee Payment Receipt Confirmation', type: 'sms', body: 'Dear {{student_name}}, we have received your fee payment of INR {{amount}} (Receipt No: {{receipt_number}}). Thank you!' },
    { id: 'bf000003-0000-0000-0000-000000000003', name: 'EXAM_HALL_TICKET_ALERT', subject: 'Hall Ticket Generated for {{exam_name}}', type: 'email', body: 'Dear {{student_name}}, your hall ticket for {{exam_name}} is now available for download from the Student Portal.' },
  ];

  for (const tp of templatesData) {
    await prisma.notificationTemplate.upsert({
      where: { id: tp.id },
      update: { body: tp.body, subject: tp.subject },
      create: {
        id: tp.id,
        academyId,
        name: tp.name,
        type: tp.type,
        subject: tp.subject,
        body: tp.body,
      },
    });
  }

  // =========================================================================
  // 19. CMS: WEBSITE PAGES, TESTIMONIALS, ADMISSION & CONTACT ENQUIRIES
  // =========================================================================
  console.log('🌐 19. Seeding CMS Pages, Testimonials, Enquiries & Gallery...');
  const websitePagesData = [
    { id: 'f19cbc6e-db2d-311b-f1b7-7aa2431866eb', title: 'About Hyvora Institute of Technology & Management', slug: 'about-us', metaTitle: 'About Us | Hyvora Institute of Technology & Management', metaDescription: 'Discover our vision, world-class faculty, accredited engineering laboratories and global academic partnerships.' },
    { id: 'b8bf8425-99a6-053b-5362-6379d33e823f', title: 'Admissions 2026-27 | Apply Online', slug: 'admissions', metaTitle: 'Admissions 2026 | Eligibility, Fee Structure & Scholarships', metaDescription: 'Apply online for B.Tech, BBA, BCA, MBA degree programs. Merit scholarships and international student quotas available.' },
    { id: 'e8629732-9634-f60f-d5fe-a6730ba55048', title: 'Campus Placements & Corporate Relations', slug: 'placements', metaTitle: 'Placements 2026 | 100% Track Record, Highest Package ₹42.5 LPA', metaDescription: 'Explore placement statistics, top recruiting companies, average CTC benchmarks and internship records.' },
    { id: 'a2997f6a-b745-b81f-f379-732cf0051313', title: 'Campus Life & State-of-the-Art Infrastructure', slug: 'campus-facilities', metaTitle: 'Campus Life | Smart Classrooms, AI Labs, Sports Complex', metaDescription: 'Explore our 50-acre green campus with Olympic swimming pool, indoor sports arena, AI research clusters and smart dining.' },
  ];

  for (const wp of websitePagesData) {
    await prisma.websitePage.upsert({
      where: { id: wp.id },
      update: { title: wp.title, metaTitle: wp.metaTitle, metaDescription: wp.metaDescription },
      create: {
        id: wp.id,
        academyId,
        title: wp.title,
        slug: wp.slug,
        metaTitle: wp.metaTitle,
        metaDescription: wp.metaDescription,
        status: 'published',
        content: {
          heroHeading: wp.title,
          heroSubtitle: 'Empowering future technology leaders through rigorous engineering & management excellence.',
          publishedYear: '2026',
        },
      },
    });
  }

  // Testimonials
  const testimonialsData = [
    { id: '877c543f-20d1-f736-6513-7b2605f4e7ca', author: 'Arjun Kumar', role: 'B.Tech CSE Student (Class of 2029)', content: 'The curriculum and hands-on projects at Hyvora Institute gave me the confidence to contribute directly to open source and secure a Tier-1 software engineering offer.', rating: 5, featured: true },
    { id: '75f54343-155d-28c8-3c6c-ff312d307b1a', author: 'Priya Patel', role: 'B.Tech CSE Student (Placed at Google @ 42.5 LPA)', content: 'The dedicated coding tracks, mock interview bootcamps, and faculty mentorship were instrumental in helping me clear top product company rounds.', rating: 5, featured: true },
    { id: 'cb508602-58ab-474b-24f0-b8c705a67d5c', author: 'Sanjay Sharma', role: 'Parent of Rahul Sharma (BBA Class of 2029)', content: 'The institutional transparency, ERP student portal, and industry exposure given to management students make Hyvora a truly world-class campus.', rating: 5, featured: true },
    { id: '33bd5e6d-a765-722d-31a9-17bfc03751bc', author: 'Rajesh Mukherjee', role: 'Talent Acquisition Lead, Microsoft India', content: 'Students from Hyvora Institute showcase exceptional problem-solving abilities and deep fundamentals in systems, networking, and modern full stack stacks.', rating: 5, featured: true },
  ];

  for (const tm of testimonialsData) {
    await prisma.testimonial.upsert({
      where: { id: tm.id },
      update: { content: tm.content, rating: tm.rating },
      create: {
        id: tm.id,
        academyId,
        authorName: tm.author,
        authorRole: tm.role,
        content: tm.content,
        rating: tm.rating,
        isFeatured: tm.featured,
      },
    });
  }

  // Contact & Admission Inquiries
  const contactEnquiriesData = [
    { id: '79e53d34-c974-8f0f-37a5-41ba2ab95073', name: 'Vikramaditya Deshmukh', email: 'vikram.d@gmail.com', phone: '+91-9876500112', subject: 'Inquiry regarding B.Tech AI & Data Science Lateral Entry', message: 'Interested in the lateral entry admission procedure, entrance exam cutoff criteria, and scholarship schemes for diploma holders.', status: 'pending' },
    { id: '5c2ed895-05a1-60c1-812e-41da0588acc6', name: 'Sunita Krishnan', email: 'sunita.k@gmail.com', phone: '+91-9876500223', subject: 'Hostel Accommodation & Campus Bus Routes from Hebbal', message: 'Requesting route details, timing, and fee structure for the Whitefield Campus AC transport service.', status: 'resolved', notes: 'Counselor contacted parent with route brochure and confirmed seat reservation.' },
    { id: 'c40162f3-6a4c-9a81-20cf-5e83fa185617', name: 'Naveen Jindal', email: 'naveen.jindal@outlook.com', phone: '+91-9876500334', subject: 'Corporate Campus Placement Tie-ups for 2026-27', message: 'We would like to register our firm for the upcoming campus recruitment cycle for Software and Data Analytics roles.', status: 'pending' },
  ];

  for (const ce of contactEnquiriesData) {
    await prisma.contactEnquiry.upsert({
      where: { id: ce.id },
      update: { status: ce.status },
      create: {
        id: ce.id,
        academyId,
        name: ce.name,
        email: ce.email,
        phone: ce.phone,
        subject: ce.subject,
        message: ce.message,
        status: ce.status,
        responseNotes: ce.notes || null,
        resolvedBy: ce.status === 'resolved' ? adminUserId : null,
      },
    });
  }

  const admissionEnquiriesData = [
    { id: '066d91ca-a999-75ee-e02d-3af0c2c936ae', firstName: 'Rohan', lastName: 'Bhardwaj', dob: '2008-05-10', courseId: cMainCseId, parent: 'Col. R. Bhardwaj', phone: '+91-9888001122', email: 'rohan.bhardwaj@gmail.com', status: 'contacted', remarks: 'Eligible with 96.4% in PCM. Scheduled for campus tour on Saturday.' },
    { id: 'a49353a4-dbdd-cdfc-298e-8c8922eb5467', firstName: 'Aastha', lastName: 'Singhania', dob: '2008-08-22', courseId: cMainAimlId, parent: 'Dr. Vivek Singhania', phone: '+91-9888002233', email: 'aastha.s@gmail.com', status: 'enrolled', remarks: 'Seat confirmed with merit scholarship of 25% on tuition.' },
    { id: '9c3bc772-399c-35d3-ca75-d92742a0aa30', firstName: 'Devendra', lastName: 'Chauhan', dob: '2008-01-15', courseId: cMainBbaId, parent: 'B. Chauhan', phone: '+91-9888003344', email: 'dev.chauhan@gmail.com', status: 'pending', remarks: 'Awaiting Class 12 board re-evaluation marks card.' },
  ];

  for (const ae of admissionEnquiriesData) {
    await prisma.admissionEnquiry.upsert({
      where: { id: ae.id },
      update: { status: ae.status, remarks: ae.remarks },
      create: {
        id: ae.id,
        academyId,
        studentFirstName: ae.firstName,
        studentLastName: ae.lastName,
        dateOfBirth: new Date(ae.dob),
        courseId: ae.courseId,
        parentName: ae.parent,
        parentPhone: ae.phone,
        parentEmail: ae.email,
        status: ae.status,
        remarks: ae.remarks,
      },
    });
  }

  // Gallery Albums & Images
  const galAlbumId = '951dc6db-224d-e987-0305-3bfd2e04c84e';
  await prisma.galleryAlbum.upsert({
    where: { id: galAlbumId },
    update: {},
    create: {
      id: galAlbumId,
      academyId,
      title: 'Campus Life & Annual Convocation 2026',
      description: 'Highlights from the Convocation Ceremony, Tech Fest HYVORATHON, and Smart Research Labs.',
      isPublic: true,
    },
  });

  // Login Activities
  try {
    await prisma.loginActivity.createMany({
      data: [
        { userId: adminUserId, attemptedEmail: 'admin@hyvora.com', status: 'success', ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        { userId: deanUserId, attemptedEmail: 'dean.academics@hitm.edu.in', status: 'success', ipAddress: '127.0.0.1', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      ],
    });
  } catch (lErr) {
    // Non-critical
  }

  console.log('=================================================================');
  console.log('🎉 HYVORA EduERP Degree College Database Seeding Finished Successfully!');
  console.log('=================================================================');
  console.log(`✅ Campuses/Branches Seeded: 3 (Main, Electronic City, Whitefield)`);
  console.log(`✅ Departments Seeded:       8 (CSE, ISE, ECE, AIML, BBA, BCA, MECH, MBA)`);
  console.log(`✅ Degree Programs/Courses:  14 across all campuses`);
  console.log(`✅ Active Batches:           15 Batches with multiple sections & semesters`);
  console.log(`✅ Faculty Members:          12 Professors & HODs with attendance & salaries`);
  console.log(`✅ Degree Students:          32 Students across all branches and courses`);
  console.log(`✅ Subjects & Curriculum:    25+ Subjects with credits, marks & type`);
  console.log(`✅ Timetable Matrix:         Full week timetable across lecture halls & labs`);
  console.log(`✅ Examinations & Results:   CIE & SEE Exams, Papers & Marks for students`);
  console.log(`✅ Finance & Fees:           Fee Structures, Allocations & Real Payment Receipts`);
  console.log(`✅ Placements & Drives:      8 Top MNC Drives (Google, MS, AWS, etc.) & Offers`);
  console.log(`✅ Internships:              Research & Corporate Internships with stipends`);
  console.log(`✅ Library Catalog:          10 Textbooks with active & returned issue records`);
  console.log(`✅ LMS Digital Learning:     Notes, PDFs, YouTube Lectures, Assignments & Grades`);
  console.log(`✅ CMS & Public Portal:      Website Pages, Testimonials, Inquiries & Gallery`);
  console.log('=================================================================');
  console.log('🔑 CREDENTIALS FOR CLIENT DEMO / PITCH:');
  console.log('👑 Admin Account:    admin@hyvora.com (or username: admin) / admin');
  console.log('👨‍🏫 Faculty Lead:    anil.kumar@hitm.edu.in / Faculty123!');
  console.log('👩‍🏫 Faculty Member:  sneha.nambiar@hitm.edu.in / Faculty123!');
  console.log('👨‍🎓 Top Student:     arjun.kumar@hitm.edu.in / Student123!');
  console.log('👩‍🎓 Placed Student:  priya.patel@hitm.edu.in / Student123!');
  console.log('👨‍🎓 BBA Student:     rahul.sharma@hitm.edu.in / Student123!');
  console.log('=================================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
