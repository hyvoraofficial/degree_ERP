-- ==============================================================================
-- HYVORA EduERP – Degree College Management System
-- Complete Production PostgreSQL DDL Schema for Supabase
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Reusable Trigger Function for 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. CORE TENANCY & MULTI-CAMPUS HIERARCHY
-- ==============================================================================

-- Academies (Tenants / Institutions)
CREATE TABLE IF NOT EXISTS academies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    domain VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_academies_updated_at BEFORE UPDATE ON academies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_academies_subdomain ON academies(subdomain) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_academies_status ON academies(status) WHERE deleted_at IS NULL;

-- Branches (Campuses / College Units)
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_branches_name UNIQUE (academy_id, name),
    CONSTRAINT uq_branches_code UNIQUE (academy_id, code)
);

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_branches_academy ON branches(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches(status) WHERE deleted_at IS NULL;

-- Media Files (Centralized Object / Document Storage)
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    bucket_name VARCHAR(100) NOT NULL DEFAULT 'media',
    access_level VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (access_level IN ('public', 'private', 'restricted')),
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_media_files_academy ON media_files(academy_id) WHERE deleted_at IS NULL;

-- ==============================================================================
-- 4. USER AUTHENTICATION & RBAC
-- ==============================================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    initial_password VARCHAR(255),
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    avatar_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
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
);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_users_academy ON users(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_roles_academy_code UNIQUE (academy_id, code)
);

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_roles_academy ON roles(academy_id) WHERE deleted_at IS NULL;

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Role Permissions Join
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id)
);

-- User Roles Join
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id) WHERE deleted_at IS NULL;

-- ==============================================================================
-- 5. DEGREE COLLEGE ACADEMIC STRUCTURE
-- ==============================================================================

-- Departments (e.g., CSE, ISE, ECE, MECH, CIVIL, AIML, Management)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    hod_id UUID, -- Links to teachers(id)
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_departments_academy_code UNIQUE (academy_id, code)
);

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_departments_academy ON departments(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_branch ON departments(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status) WHERE deleted_at IS NULL;

-- Courses / Degree Programs (e.g., B.Tech CSE, BCA, BBA, B.Com)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    degree_type VARCHAR(100) DEFAULT 'B.Tech',
    duration VARCHAR(100) DEFAULT '4 Years',
    total_semesters INT NOT NULL DEFAULT 8 CHECK (total_semesters > 0),
    scheme_year VARCHAR(50) DEFAULT '2026',
    credits_required INT DEFAULT 160,
    description TEXT,
    syllabus_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_courses_branch_code UNIQUE (branch_id, code),
    CONSTRAINT uq_courses_branch_name UNIQUE (branch_id, name)
);

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_courses_academy ON courses(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_courses_branch ON courses(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_courses_dept ON courses(department_id) WHERE deleted_at IS NULL;

-- Subjects / University Curriculum
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    semester INT NOT NULL DEFAULT 1 CHECK (semester BETWEEN 1 AND 12),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    subject_type VARCHAR(50) NOT NULL DEFAULT 'theory' CHECK (subject_type IN ('theory', 'lab', 'elective', 'project', 'seminar')),
    credits INT NOT NULL DEFAULT 3 CHECK (credits >= 0),
    internal_marks NUMERIC(6, 2) DEFAULT 40.00 CHECK (internal_marks >= 0),
    external_marks NUMERIC(6, 2) DEFAULT 60.00 CHECK (external_marks >= 0),
    total_marks NUMERIC(6, 2) DEFAULT 100.00 CHECK (total_marks > 0),
    passing_marks NUMERIC(6, 2) DEFAULT 40.00 CHECK (passing_marks >= 0),
    is_elective BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_subjects_course_code UNIQUE (course_id, code),
    CONSTRAINT uq_subjects_course_name UNIQUE (course_id, name)
);

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_subjects_academy ON subjects(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_course ON subjects(course_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_dept ON subjects(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subjects_sem ON subjects(semester) WHERE deleted_at IS NULL;

-- Batches / Academic Sections (e.g., 2023-27 CSE 6th Sem Sec A)
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    academic_year VARCHAR(50) DEFAULT '2026-2030',
    current_semester INT NOT NULL DEFAULT 1 CHECK (current_semester BETWEEN 1 AND 12),
    section_name VARCHAR(50) DEFAULT 'A',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    capacity INT CHECK (capacity > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_batches_branch_code UNIQUE (branch_id, code),
    CONSTRAINT chk_batch_dates CHECK (start_date <= end_date)
);

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_batches_academy ON batches(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_batches_branch ON batches(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_batches_course ON batches(course_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_batches_dept ON batches(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_batches_sem ON batches(current_semester) WHERE deleted_at IS NULL;

-- ==============================================================================
-- 6. FACULTY & DEGREE STUDENTS
-- ==============================================================================

-- Teachers (Faculty Members)
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_number VARCHAR(100) NOT NULL,
    designation VARCHAR(100) DEFAULT 'Assistant Professor',
    qualification VARCHAR(255),
    experience_years INT DEFAULT 3,
    specialization VARCHAR(255),
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    salary_structure JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_teachers_academy_employee_number UNIQUE (academy_id, employee_number)
);

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_teachers_academy ON teachers(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_branch ON teachers(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_dept ON teachers(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_teachers_user ON teachers(user_id) WHERE deleted_at IS NULL;

-- Link HOD back to departments
ALTER TABLE departments
DROP CONSTRAINT IF EXISTS fk_departments_hod_id;
ALTER TABLE departments
ADD CONSTRAINT fk_departments_hod_id FOREIGN KEY (hod_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- Students (Degree College Students)
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    semester INT NOT NULL DEFAULT 1 CHECK (semester BETWEEN 1 AND 12),
    section VARCHAR(50) DEFAULT 'A',
    admission_year VARCHAR(50) DEFAULT '2026',
    university_reg_number VARCHAR(100),
    admission_number VARCHAR(100) NOT NULL,
    admission_date DATE NOT NULL DEFAULT CURRENT_DATE,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(50) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    blood_group VARCHAR(20),
    parent_name VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(50) NOT NULL,
    parent_email VARCHAR(255),
    father_name VARCHAR(255),
    mother_name VARCHAR(255),
    roll_number VARCHAR(100),
    fee_plan VARCHAR(100),
    student_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (student_status IN ('active', 'inactive', 'detained', 'graduated', 'suspended')),
    student_photo_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    aadhaar_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    previous_marks_card_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_students_academy_admission_number UNIQUE (academy_id, admission_number)
);

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_students_academy ON students(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_course ON students(course_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_dept ON students(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_sem ON students(semester) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number) WHERE deleted_at IS NULL;

-- Teacher Subjects (Workload Mapping)
CREATE TABLE IF NOT EXISTS teacher_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_teacher_subject_batch UNIQUE (teacher_id, subject_id, batch_id)
);

-- ==============================================================================
-- 7. TIMETABLE & CLASSROOM SCHEDULING
-- ==============================================================================

CREATE TABLE IF NOT EXISTS timetable_schedules (
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
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'rescheduled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_timetable_schedules_updated_at BEFORE UPDATE ON timetable_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_timetables_academy ON timetable_schedules(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timetables_batch ON timetable_schedules(batch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timetables_teacher ON timetable_schedules(teacher_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_timetables_day ON timetable_schedules(day_of_week) WHERE deleted_at IS NULL;

-- ==============================================================================
-- 8. CAMPUS PLACEMENTS & INTERNSHIPS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS placement_drives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_role VARCHAR(255) NOT NULL,
    package_lpa NUMERIC(6, 2) NOT NULL CHECK (package_lpa >= 0),
    eligibility_criteria TEXT,
    drive_date DATE,
    deadline_date DATE,
    location VARCHAR(255),
    job_type VARCHAR(100) DEFAULT 'Full-time',
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_placement_drives_updated_at BEFORE UPDATE ON placement_drives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_placements_academy ON placement_drives(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_placements_status ON placement_drives(status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS student_placements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    drive_id UUID NOT NULL REFERENCES placement_drives(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'interview_scheduled', 'offered', 'rejected')),
    remarks TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_student_placement UNIQUE (drive_id, student_id)
);

CREATE TRIGGER update_student_placements_updated_at BEFORE UPDATE ON student_placements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_student_placements_drive ON student_placements(drive_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_student_placements_student ON student_placements(student_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS internship_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    company_name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    stipend NUMERIC(10, 2) CHECK (stipend >= 0),
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'verified')),
    certificate_url VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_internships_updated_at BEFORE UPDATE ON internship_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_internships_student ON internship_records(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_internships_teacher ON internship_records(teacher_id) WHERE deleted_at IS NULL;

-- ==============================================================================
-- 9. COLLEGE LIBRARY & BOOK CIRCULATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS library_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(100),
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    publisher VARCHAR(255),
    total_copies INT NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
    available_copies INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
    shelf_location VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'out_of_stock', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_library_books_updated_at BEFORE UPDATE ON library_books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_books_academy ON library_books(academy_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_books_dept ON library_books(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_books_isbn ON library_books(isbn) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS book_issue_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (fine_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'returned', 'overdue', 'lost')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_book_issues_updated_at BEFORE UPDATE ON book_issue_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_book_issues_book ON book_issue_records(book_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_book_issues_student ON book_issue_records(student_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_book_issues_status ON book_issue_records(status) WHERE deleted_at IS NULL;

-- ==============================================================================
-- 10. GRADING SCHEME & SEMESTER SGPA / CGPA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS grading_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Standard 10-Point UGC / VTU Scheme',
    grade_scale JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_grading_schemes_updated_at BEFORE UPDATE ON grading_schemes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_grading_schemes_academy ON grading_schemes(academy_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS student_semester_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester INT NOT NULL CHECK (semester BETWEEN 1 AND 12),
    academic_year VARCHAR(50) NOT NULL,
    sgpa NUMERIC(4, 2) CHECK (sgpa BETWEEN 0 AND 10),
    cgpa NUMERIC(4, 2) CHECK (cgpa BETWEEN 0 AND 10),
    total_credits_earned INT CHECK (total_credits_earned >= 0),
    backlogs_count INT NOT NULL DEFAULT 0 CHECK (backlogs_count >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'passed' CHECK (status IN ('passed', 'failed', 'withheld')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_student_semester_grade UNIQUE (student_id, semester)
);

CREATE TRIGGER update_student_semester_grades_updated_at BEFORE UPDATE ON student_semester_grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_semester_grades_student ON student_semester_grades(student_id) WHERE deleted_at IS NULL;

-- ==============================================================================
-- 11. ATTENDANCE & EXAMINATIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_students INT NOT NULL DEFAULT 0,
    present_count INT NOT NULL DEFAULT 0,
    absent_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_attendance_session UNIQUE (batch_id, subject_id, date)
);

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_attendance_record UNIQUE (attendance_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);

CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    exam_type VARCHAR(100) NOT NULL DEFAULT 'term' CHECK (exam_type IN ('term', 'final', 'quiz', 'class_test', 'mid_term')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_exam_dates CHECK (start_date <= end_date)
);

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS exam_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    max_marks NUMERIC(6, 2) NOT NULL CHECK (max_marks > 0),
    passing_marks NUMERIC(6, 2) NOT NULL CHECK (passing_marks > 0),
    question_paper_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT chk_exam_passing_marks CHECK (passing_marks <= max_marks)
);

CREATE TRIGGER update_exam_papers_updated_at BEFORE UPDATE ON exam_papers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS exam_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    exam_paper_id UUID NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(6, 2) CHECK (marks_obtained >= 0),
    remarks TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pass' CHECK (status IN ('pass', 'fail', 'absent', 'malpractice')),
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_exam_result UNIQUE (exam_paper_id, student_id)
);

CREATE TRIGGER update_exam_results_updated_at BEFORE UPDATE ON exam_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);

-- ==============================================================================
-- 12. FEES, FINANCE & PAYMENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    frequency VARCHAR(50) NOT NULL DEFAULT 'annual' CHECK (frequency IN ('one_time', 'semester', 'annual', 'monthly', 'term', 'quarterly')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON fee_structures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS fee_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'void')),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_fee_allocations_updated_at BEFORE UPDATE ON fee_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_fee_allocations_student ON fee_allocations(student_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    fee_allocation_id UUID NOT NULL REFERENCES fee_allocations(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    payment_method VARCHAR(100) CHECK (payment_method IN ('card', 'net_banking', 'upi', 'wallet', 'cash', 'bank_transfer', 'cheque', 'gateway')),
    gateway_provider VARCHAR(100),
    gateway_order_id VARCHAR(255),
    gateway_transaction_ref VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
    failure_reason TEXT,
    gateway_response JSONB DEFAULT '{}'::jsonb NOT NULL,
    retry_count INT DEFAULT 0 NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    fee_allocation_id UUID NOT NULL REFERENCES fee_allocations(id) ON DELETE CASCADE,
    payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid > 0),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    receipt_number VARCHAR(100) NOT NULL,
    payment_mode VARCHAR(100) NOT NULL,
    reference_no VARCHAR(255),
    remarks TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_payments_receipt_number UNIQUE (academy_id, receipt_number)
);

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_payments_allocation ON payments(fee_allocation_id);

-- ==============================================================================
-- 13. STUDY MATERIALS, LMS & ASSIGNMENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS study_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE RESTRICT,
    access_level VARCHAR(50) NOT NULL DEFAULT 'batch_only' CHECK (access_level IN ('public', 'registered', 'batch_only')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_study_materials_updated_at BEFORE UPDATE ON study_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS study_material_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    study_material_id UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_study_material_batch UNIQUE (study_material_id, batch_id)
);

CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    max_marks NUMERIC(6, 2) NOT NULL CHECK (max_marks > 0),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    media_file_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE RESTRICT,
    student_remarks TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'late_submission', 'resubmission_required')),
    marks_obtained NUMERIC(6, 2) CHECK (marks_obtained >= 0),
    teacher_remarks TEXT,
    graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_assignment_submission UNIQUE (assignment_id, student_id)
);

CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 14. SETTINGS, NOTIFICATIONS & CMS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS academy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL UNIQUE REFERENCES academies(id) ON DELETE CASCADE,
    logo_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    favicon_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
    primary_color VARCHAR(50) DEFAULT '#4F46E5',
    secondary_color VARCHAR(50) DEFAULT '#06B6D4',
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    timezone VARCHAR(100) DEFAULT 'Asia/Kolkata',
    currency VARCHAR(50) DEFAULT 'INR',
    theme VARCHAR(50) DEFAULT 'light',
    academic_year VARCHAR(50) DEFAULT '2026-27',
    current_semester VARCHAR(100) DEFAULT 'Odd Semester (1, 3, 5, 7)',
    institution_type VARCHAR(100) DEFAULT 'Engineering & Degree College',
    smtp_settings JSONB DEFAULT '{}'::jsonb,
    payment_gateway_keys JSONB DEFAULT '{}'::jsonb,
    social_links JSONB DEFAULT '{}'::jsonb,
    seo_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_academy_settings_updated_at BEFORE UPDATE ON academy_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'in_app' CHECK (type IN ('email', 'sms', 'push', 'in_app')),
    status VARCHAR(50) NOT NULL DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'read', 'failed')),
    read_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id) WHERE deleted_at IS NULL;

-- Dashboard Cache
CREATE TABLE IF NOT EXISTS dashboard_cache (
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
);

CREATE TRIGGER update_dashboard_cache_updated_at BEFORE UPDATE ON dashboard_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_dashboard_cache_lookup ON dashboard_cache(academy_id, metric_key) WHERE deleted_at IS NULL;
