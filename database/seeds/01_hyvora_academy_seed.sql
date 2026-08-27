-- NOTE: Hyvora Academy is demonstration seed data and is not a production tenant assumption.
-- Seeds for Hyvora Academy Demo (Multi-Tenant SaaS)

-- 1. Create Academy
INSERT INTO academies (id, name, subdomain, domain, status)
VALUES (
    'a1111111-1111-1111-1111-111111111111', 
    'Hyvora Academy', 
    'hyvora', 
    'hyvora.edu', 
    'active'
);

-- 2. Create Academy Settings
INSERT INTO academy_settings (
    id, academy_id, primary_color, secondary_color, address, phone, email, timezone, currency, theme, smtp_settings, payment_gateway_keys, social_links, seo_settings
) VALUES (
    'a2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    '#4F46E5', -- Indigo
    '#06B6D4', -- Cyan
    '123 Science Park Drive, Tech City, Karnataka, India',
    '+91-9876543210',
    'info@hyvora.com',
    'Asia/Kolkata',
    'INR',
    'system',
    '{"host": "smtp.gmail.com", "port": 587, "user": "smtp@hyvora.com", "secure": true}'::jsonb,
    '{"razorpay": {"key": "rzp_test_123", "secret": "secret_123"}}'::jsonb,
    '{"facebook": "facebook.com/hyvora", "youtube": "youtube.com/c/hyvoraacademy"}'::jsonb,
    '{"meta_title": "Hyvora Academy | Leading STEM School", "meta_description": "Empowering students through science and tech."}'::jsonb
);

-- 3. Create Global/Local Roles
-- Global Role (Super Admin - resides in NULL academy space)
INSERT INTO roles (id, academy_id, name, code, description, is_system)
VALUES (
    'r1111111-1111-1111-1111-111111111111',
    NULL,
    'Super Admin',
    'SUPER_ADMIN',
    'Global System Super Administrator for HYVORA platform management.',
    true
);

-- Tenant Local Roles
INSERT INTO roles (id, academy_id, name, code, description, is_system)
VALUES 
(
    'r2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'Academy Admin',
    'ACADEMY_ADMIN',
    'Administrator with full access to Academy details.',
    true
),
(
    'r3333333-3333-3333-3333-333333333333',
    'a1111111-1111-1111-1111-111111111111',
    'Teacher',
    'TEACHER',
    'Academic staff responsible for classes, schedules, and grading.',
    true
),
(
    'r4444444-4444-4444-4444-444444444444',
    'a1111111-1111-1111-1111-111111111111',
    'Student',
    'STUDENT',
    'Enrolled academic learner.',
    true
);

-- 4. Create Permissions Catalog
INSERT INTO permissions (id, name, code, description, resource, action)
VALUES
('p0111111-1111-1111-1111-111111111111', 'Create Users', 'users:create', 'Create user accounts', 'users', 'create'),
('p0222222-2222-2222-2222-222222222222', 'Read Users', 'users:read', 'View user accounts', 'users', 'read'),
('p0333333-3333-3333-3333-333333333333', 'Update Users', 'users:update', 'Edit user accounts', 'users', 'update'),
('p0444444-4444-4444-4444-444444444444', 'Delete Users', 'users:delete', 'Soft delete user accounts', 'users', 'delete'),

('p0555555-5555-5555-5555-555555555555', 'Read Students', 'students:read', 'View student profiles', 'students', 'read'),
('p0666666-6666-6666-6666-666666666666', 'Edit Students', 'students:update', 'Update student profiles', 'students', 'update'),

('p0777777-7777-7777-7777-777755555555', 'Mark Attendance', 'attendance:create', 'Record batch attendance', 'attendance', 'create'),
('p0888888-8888-8888-8888-888855555555', 'Read Attendance', 'attendance:read', 'View attendance sheets', 'attendance', 'read'),

('p0999999-9999-9999-9999-999955555555', 'Manage Fees', 'fees:manage', 'Configure fee categories and allocations', 'fees', 'manage'),
('p1010101-1010-1010-1010-101055555555', 'Process Payments', 'payments:create', 'Log student fees transactions', 'payments', 'create'),

('p1111112-1112-1112-1112-111255555555', 'Manage Assignments', 'assignments:manage', 'Create, update, and delete homework assignments', 'assignments', 'manage'),
('p1212122-1212-1212-1212-121255555555', 'Grade Submissions', 'submissions:grade', 'Grade student assignment entries', 'submissions', 'grade');

-- 5. Map Permissions to Academy Admin & Teacher Roles
-- Admin gets all permissions
INSERT INTO role_permissions (academy_id, role_id, permission_id)
SELECT 'a1111111-1111-1111-1111-111111111111', 'r2222222-2222-2222-2222-222222222222', id FROM permissions;

-- Teacher gets read access and academic duties
INSERT INTO role_permissions (academy_id, role_id, permission_id)
VALUES
('a1111111-1111-1111-1111-111111111111', 'r3333333-3333-3333-3333-333333333333', 'p0222222-2222-2222-2222-222222222222'), -- Read users
('a1111111-1111-1111-1111-111111111111', 'r3333333-3333-3333-3333-333333333333', 'p0555555-5555-5555-5555-555555555555'), -- Read students
('a1111111-1111-1111-1111-111111111111', 'r3333333-3333-3333-3333-333333333333', 'p0777777-7777-7777-7777-777755555555'), -- Mark attendance
('a1111111-1111-1111-1111-111111111111', 'r3333333-3333-3333-3333-333333333333', 'p0888888-8888-8888-8888-888855555555'), -- Read attendance
('a1111111-1111-1111-1111-111111111111', 'r3333333-3333-3333-3333-333333333333', 'p1111112-1112-1112-1112-111255555555'), -- Manage assignments
('a1111111-1111-1111-1111-111111111111', 'r3333333-3333-3333-3333-333333333333', 'p1212122-1212-1212-1212-121255555555'); -- Grade submissions

-- 6. Create Users (Admin, Teachers, Students)
-- Password hashes are dummy placeholders for bcrypt verification
INSERT INTO users (id, academy_id, email, password_hash, first_name, last_name, phone, status)
VALUES
-- Admin: Hemanth
('u1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'admin@hyvora.com', '$2b$10$ara0QF.U31LPOKYcW9o74.YNYgqC3JSFD0YbucMc6pxSlKkeiSK72', 'Hyvora', 'Admin', '+91-9999999901', 'active'),
('u1111111-1111-1111-1111-111111111112', 'a1111111-1111-1111-1111-111111111111', 'admin', '$2b$10$ara0QF.U31LPOKYcW9o74.YNYgqC3JSFD0YbucMc6pxSlKkeiSK72', 'Hyvora', 'Admin', '+91-9999999901', 'active'),
-- Teacher: Ramesh Kumar
('u2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'ramesh@hyvora.com', '$2b$12$K1dD6r6.C/2b3W27i/sBpejS.W.npx72lZ2y8s22R2n3.x4y5z1a3', 'Ramesh', 'Kumar', '+91-9999999902', 'active'),
-- Student: Priya Nair
('u5555555-5555-5555-5555-555555555555', 'a1111111-1111-1111-1111-111111111111', 'priya@hyvora.com', '$2b$12$K1dD6r6.C/2b3W27i/sBpejS.W.npx72lZ2y8s22R2n3.x4y5z1a6', 'Priya', 'Nair', '+91-9999999905', 'active');

-- 7. Assign User Roles
INSERT INTO user_roles (academy_id, user_id, role_id)
VALUES
('a1111111-1111-1111-1111-111111111111', 'u1111111-1111-1111-1111-111111111111', 'r2222222-2222-2222-2222-222222222222'), -- Admin
('a1111111-1111-1111-1111-111111111111', 'u1111111-1111-1111-1111-111111111112', 'r2222222-2222-2222-2222-222222222222'), -- Admin Alias
('a1111111-1111-1111-1111-111111111111', 'u2222222-2222-2222-2222-222222222222', 'r3333333-3333-3333-3333-333333333333'), -- Ramesh
('a1111111-1111-1111-1111-111111111111', 'u5555555-5555-5555-5555-555555555555', 'r4444444-4444-4444-4444-444444444444'); -- Priya

-- 8. Create Teachers Profiles
INSERT INTO teachers (id, academy_id, user_id, employee_id, specialization, qualification, joining_date, salary)
VALUES
(
    't1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'u2222222-2222-2222-2222-222222222222',
    'EMP-HYV-101',
    '{"Mathematics", "Physics"}'::varchar[],
    'M.Sc. in Mathematics, B.Ed.',
    '2024-06-01',
    75000.00
);

-- 9. Create Students Profiles
INSERT INTO students (id, academy_id, user_id, admission_number, admission_date, date_of_birth, gender, blood_group, parent_name, parent_phone, parent_email)
VALUES
(
    's2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'u5555555-5555-5555-5555-555555555555',
    'HYV-2026-0002',
    '2026-03-12',
    '2011-08-22',
    'female',
    'A-',
    'Karan Nair',
    '+91-9876543212',
    'karan.nair@yahoo.com'
);

-- 10. Courses, Subjects and Batches
INSERT INTO courses (id, academy_id, name, code, description, duration_months)
VALUES
('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Grade 10', 'GRADE-10', 'High School Matriculation Curriculum', 12),
('c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Grade 11 - Science', 'GRADE-11-SCI', 'Intermediate Science Stream', 12);

INSERT INTO subjects (id, academy_id, name, code, description)
VALUES
('sub11111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Advanced Mathematics', 'MATH-10', 'Algebra, Trigonometry, Calculus foundation'),
('sub22222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Classical Physics', 'PHYS-10', 'Mechanics, Electromagnetism, Optics'),
('sub33333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'Intro to Programming', 'CS-11', 'Fundamentals of Python, Data structures');

INSERT INTO course_subjects (academy_id, course_id, subject_id)
VALUES
('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'sub11111-1111-1111-1111-111111111111'), -- Grade 10 -> Math
('a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'sub22222-2222-2222-2222-222222222222'), -- Grade 10 -> Physics
('a1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'sub11111-1111-1111-1111-111111111111'), -- Grade 11 Sci -> Math
('a1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'sub33333-3333-3333-3333-333333333333'); -- Grade 11 Sci -> CS

INSERT INTO batches (id, academy_id, course_id, name, start_date, end_date, max_strength, status)
VALUES
('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Grade 10 - Batch A (2026)', '2026-04-01', '2027-03-31', 40, 'active');

-- Enroll students in Batch A
INSERT INTO batch_students (academy_id, batch_id, student_id, roll_number, enrollment_status)
VALUES
('a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', '10A-01', 'active'),
('a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', '10A-02', 'active');

-- Assign teachers to Batch A
INSERT INTO batch_teachers (academy_id, batch_id, teacher_id, subject_id, is_primary_tutor)
VALUES
('a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'sub11111-1111-1111-1111-111111111111', true), -- Ramesh -> Math (Primary)
('a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'sub22222-2222-2222-2222-222222222222', false); -- Ramesh -> Physics

-- 11. Class Schedules
INSERT INTO class_schedules (id, academy_id, batch_id, subject_id, teacher_id, day_of_week, start_time, end_time, classroom_no)
VALUES
('cs111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'sub11111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 1, '09:00:00', '10:00:00', 'Room 101'), -- Mon Math
('cs222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'sub22222-2222-2222-2222-222222222222', 't1111111-1111-1111-1111-111111111111', 2, '10:00:00', '11:00:00', 'Room 102'); -- Tue Physics

-- 12. Attendance records
INSERT INTO attendance (id, academy_id, student_id, batch_id, class_schedule_id, date, status, remarks, marked_by)
VALUES
(uuid_generate_v4(), 'a1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'cs111111-1111-1111-1111-111111111111', '2026-07-26', 'present', 'On time', 'u2222222-2222-2222-2222-222222222222'),
(uuid_generate_v4(), 'a1111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'cs111111-1111-1111-1111-111111111111', '2026-07-26', 'present', 'On time', 'u2222222-2222-2222-2222-222222222222'),
(uuid_generate_v4(), 'a1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'cs222222-2222-2222-2222-222222222222', '2026-07-27', 'present', 'Active listener', 'u2222222-2222-2222-2222-222222222222'),
(uuid_generate_v4(), 'a1111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'cs222222-2222-2222-2222-222222222222', '2026-07-27', 'late', '10 mins late due to traffic', 'u2222222-2222-2222-2222-222222222222');

-- 13. Create Media Files (S3 bucket maps)
INSERT INTO media_files (id, academy_id, filename, original_filename, mime_type, file_size, storage_path, bucket_name, access_level, uploaded_by)
VALUES
(
    'f1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'nuc_syllabus_math.pdf',
    'Math_Syllabus_Class10_Final.pdf',
    'application/pdf',
    1048576, -- 1MB
    'hyvora/syllabus/hyv_syllabus_math.pdf',
    'academic-materials',
    'public',
    'u2222222-2222-2222-2222-222222222222'
),
(
    'f2222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'nuc_assignment1_math.pdf',
    'Homework_Assignment1_Trig.pdf',
    'application/pdf',
    512000, -- 500KB
    'hyvora/assignments/hyv_assignment1_math.pdf',
    'academic-materials',
    'restricted',
    'u2222222-2222-2222-2222-222222222222'
),
(
    'f3333333-3333-3333-3333-333333333333',
    'a1111111-1111-1111-1111-111111111111',
    'arjun_sol_assignment1.pdf',
    'ArjunMehta_MathAssignment1_Solved.pdf',
    'application/pdf',
    2097152, -- 2MB
    'hyvora/student-submissions/arjun_sol_assignment1.pdf',
    'student-vault',
    'private',
    'u4444444-4444-4444-4444-444444444444'
);

-- Update Academy Settings with Logo
UPDATE academy_settings 
SET logo_id = 'f1111111-1111-1111-1111-111111111111'
WHERE academy_id = 'a1111111-1111-1111-1111-111111111111';

-- 14. Fee Structures & Allocations
INSERT INTO fee_structures (id, academy_id, name, description, amount, frequency)
VALUES
('fee11111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Annual Tuition Fee Grade 10', 'Primary tuition costs covering full year academics.', 120000.00, 'annual'),
('fee22222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Science Lab Facility Charge', 'Covers physics, chemistry, and CS lab maintenance.', 10000.00, 'one_time');

-- Allocate fees to Arjun & Priya
INSERT INTO fee_allocations (id, academy_id, fee_structure_id, student_id, due_date, status, total_amount, paid_amount, discount_amount)
VALUES
(
    'fa111111-1111-1111-1111-111111111111', 
    'a1111111-1111-1111-1111-111111111111', 
    'fee11111-1111-1111-1111-111111111111', 
    's1111111-1111-1111-1111-111111111111', -- Arjun
    '2026-06-30', 
    'partially_paid', 
    120000.00, 
    60000.00, 
    0.00
),
(
    'fa222222-2222-2222-2222-222222222222', 
    'a1111111-1111-1111-1111-111111111111', 
    'fee11111-1111-1111-1111-111111111111', 
    's2222222-2222-2222-2222-222222222222', -- Priya
    '2026-06-30', 
    'paid', 
    120000.00, 
    120000.00, 
    0.00
);

-- 15. Create Payment Transactions
INSERT INTO payment_transactions (id, academy_id, fee_allocation_id, amount, currency, payment_method, gateway_provider, gateway_order_id, gateway_transaction_ref, status, gateway_response, retry_count)
VALUES
(
    'pt111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'fa111111-1111-1111-1111-111111111111', -- Arjun
    60000.00,
    'INR',
    'bank_transfer',
    NULL,
    NULL,
    'TXN-HYV-BT987',
    'completed',
    '{"bank": "State Bank of India", "auth_code": "SBI8872"}'::jsonb,
    0
),
(
    'pt222222-2222-2222-2222-222222222222',
    'a1111111-1111-1111-1111-111111111111',
    'fa222222-2222-2222-2222-222222222222', -- Priya
    120000.00,
    'INR',
    'gateway',
    'razorpay',
    'order_rp_priya123',
    'pay_rp_priya_txn1',
    'completed',
    '{"gateway": "razorpay", "status": "captured", "card_detail": "xxxx-xxxx-xxxx-4512"}'::jsonb,
    0
),
(
    'pt333333-3333-3333-3333-333333333333',
    'a1111111-1111-1111-1111-111111111111',
    'fa111111-1111-1111-1111-111111111111', -- Arjun (failed attempt)
    60000.00,
    'INR',
    'gateway',
    'stripe',
    'stripe_ord_arjun_err',
    NULL,
    'failed',
    '{"error": "card_declined", "decline_code": "insufficient_funds"}'::jsonb,
    1
);

-- 16. Record Successful Payments
INSERT INTO payments (id, academy_id, fee_allocation_id, payment_transaction_id, amount_paid, payment_date, receipt_number, payment_mode, reference_no, recorded_by)
VALUES
(
    uuid_generate_v4(),
    'a1111111-1111-1111-1111-111111111111',
    'fa111111-1111-1111-1111-111111111111', -- Arjun
    'pt111111-1111-1111-1111-111111111111',
    60000.00,
    '2026-06-25 10:30:00+05:30',
    'REC-HYV-2026-0001',
    'bank_transfer',
    'TXN-HYV-BT987',
    'u1111111-1111-1111-1111-111111111111' -- Recorded by Admin Hemanth
),
(
    uuid_generate_v4(),
    'a1111111-1111-1111-1111-111111111111',
    'fa222222-2222-2222-2222-222222222222', -- Priya
    'pt222222-2222-2222-2222-222222222222',
    120000.00,
    '2026-06-28 15:45:00+05:30',
    'REC-HYV-2026-0002',
    'online_gateway',
    'pay_rp_priya_txn1',
    'u1111111-1111-1111-1111-111111111111'
);

-- 17. Study Materials
INSERT INTO study_materials (id, academy_id, title, description, subject_id, teacher_id, media_file_id, access_level)
VALUES
(
    'm1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'Grade 10 Math Core Syllabus',
    'Syllabus mapping and list of reference textbooks.',
    'sub11111-1111-1111-1111-111111111111', -- Math
    't1111111-1111-1111-1111-111111111111', -- Ramesh
    'f1111111-1111-1111-1111-111111111111', -- syllabus pdf
    'batch_only'
);

-- Link study material to Batch A
INSERT INTO study_material_batches (academy_id, study_material_id, batch_id)
VALUES ('a1111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111');

-- 18. Video Lectures
INSERT INTO video_lectures (id, academy_id, title, description, subject_id, teacher_id, external_video_url, video_provider, duration_seconds, access_level)
VALUES
(
    'v1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'Basics of Classical Mechanics',
    'Introductory class on classical velocity, speed and Newtonian laws.',
    'sub22222-2222-2222-2222-222222222222', -- Physics
    't1111111-1111-1111-1111-111111111111', -- Ramesh
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'youtube',
    212,
    'batch_only'
);

INSERT INTO video_lecture_batches (academy_id, video_lecture_id, batch_id)
VALUES ('a1111111-1111-1111-1111-111111111111', 'v1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111');

-- 19. Assignments
INSERT INTO assignments (id, academy_id, batch_id, subject_id, teacher_id, title, description, max_marks, due_date, media_file_id)
VALUES
(
    'as111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'b1111111-1111-1111-1111-111111111111', -- Batch A
    'sub11111-1111-1111-1111-111111111111', -- Math
    't1111111-1111-1111-1111-111111111111', -- Ramesh
    'Trigonometry Practice Sheet 1',
    'Please solve all 10 questions. Show detailed steps for full credit.',
    50.00,
    '2026-08-10 23:59:59+05:30',
    'f2222222-2222-2222-2222-222222222222' -- trig assignment pdf
);

-- Arjun Submits his Homework
INSERT INTO assignment_submissions (id, academy_id, assignment_id, student_id, submission_date, media_file_id, student_remarks, status, marks_obtained, teacher_remarks, graded_by, graded_at)
VALUES
(
    uuid_generate_v4(),
    'a1111111-1111-1111-1111-111111111111',
    'as111111-1111-1111-1111-111111111111',
    's1111111-1111-1111-1111-111111111111', -- Arjun
    '2026-07-26 18:22:00+05:30',
    'f3333333-3333-3333-3333-333333333333', -- Arjun solved pdf
    'Completed all questions. Please review.',
    'submitted',
    NULL,
    NULL,
    NULL,
    NULL
);

-- 20. Exams, Papers & Results
INSERT INTO exams (id, academy_id, name, description, exam_type, start_date, end_date)
VALUES
('e1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'First Month Mid-Term Quiz', 'Classroom quiz assessing basic skills', 'quiz', '2026-07-25', '2026-07-25');

INSERT INTO exam_papers (id, academy_id, exam_id, subject_id, batch_id, exam_date, start_time, duration_minutes, max_marks, passing_marks, question_paper_id)
VALUES
(
    'ep111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'sub11111-1111-1111-1111-111111111111', -- Math
    'b1111111-1111-1111-1111-111111111111', -- Batch A
    '2026-07-25',
    '11:00:00',
    60,
    20.00,
    8.00,
    NULL
);

INSERT INTO exam_results (id, academy_id, exam_paper_id, student_id, marks_obtained, remarks, status, graded_by)
VALUES
(
    uuid_generate_v4(), 
    'a1111111-1111-1111-1111-111111111111', 
    'ep111111-1111-1111-1111-111111111111', 
    's1111111-1111-1111-1111-111111111111', -- Arjun
    18.50, 
    'Excellent understanding of quadratic formulas.', 
    'pass', 
    'u2222222-2222-2222-2222-222222222222' -- Graded by Ramesh
),
(
    uuid_generate_v4(), 
    'a1111111-1111-1111-1111-111111111111', 
    'ep111111-1111-1111-1111-111111111111', 
    's2222222-2222-2222-2222-222222222222', -- Priya
    19.00, 
    'Outstanding layout, minor arithmetic check.', 
    'pass', 
    'u2222222-2222-2222-2222-222222222222'
);

-- 21. Website CMS and Leads
INSERT INTO website_pages (id, academy_id, title, slug, content, status, meta_title, meta_description)
VALUES
(
    uuid_generate_v4(),
    'a1111111-1111-1111-1111-111111111111',
    'Homepage',
    'home',
    '{"hero_title": "Welcome to Hyvora Academy", "hero_subtitle": "Nurturing Innovation and Science Leadership", "sections": [{"type": "features", "title": "Our Features", "items": ["Modern CS Lab", "Robotics Competitions", "Advanced Calculus Stream"]}]}'::jsonb,
    'published',
    'Hyvora Academy - Tech & Science Leadership Academy',
    'Official website homepage of Hyvora Academy.'
);

INSERT INTO testimonials (id, academy_id, author_name, author_role, content, rating, is_featured)
VALUES
(
    uuid_generate_v4(),
    'a1111111-1111-1111-1111-111111111111',
    'Rajesh Mehta',
    'Parent of Grade 10 Student',
    'The individual attention given to student progress in math and computers is exemplary. Arjun has improved significantly.',
    5,
    true
);

INSERT INTO contact_enquiries (id, academy_id, name, email, phone, subject, message, status)
VALUES
(
    uuid_generate_v4(),
    'a1111111-1111-1111-1111-111111111111',
    'Kiran Verma',
    'kiran.verma@outlook.com',
    '+91-8888888801',
    'Admission query for term 2',
    'Hi, does Hyvora Academy accept middle-term lateral admissions for Grade 10?',
    'pending'
);

INSERT INTO admission_enquiries (id, academy_id, student_first_name, student_last_name, date_of_birth, course_id, parent_name, parent_phone, parent_email, status, remarks)
VALUES
(
    uuid_generate_v4(),
    'a1111111-1111-1111-1111-111111111111',
    'Rohan',
    'Sharma',
    '2009-12-04',
    'c2222222-2222-2222-2222-222222222222', -- Grade 11 Sci
    'Devendra Sharma',
    '+91-7777777701',
    'devendra@outlook.com',
    'contacted',
    'Parent requests fee concession details.'
);

-- 22. Business Activities Log & Dashboard Cache
INSERT INTO activity_logs (academy_id, user_id, event_type, description, metadata, ip_address, created_at)
VALUES
('a1111111-1111-1111-1111-111111111111', 'u1111111-1111-1111-1111-111111111111', 'USER_LOGIN', 'Administrator Hemanth logged in successfully.', '{"browser": "Chrome", "os": "macOS"}'::jsonb, '192.168.1.50', '2026-07-27 09:00:00+05:30'),
('a1111111-1111-1111-1111-111111111111', 'u2222222-2222-2222-2222-222222222222', 'ATTENDANCE_UPDATE', 'Teacher Ramesh Kumar updated attendance sheet for Grade 10 - Batch A.', '{"batch_id": "b1111111-1111-1111-1111-111111111111"}'::jsonb, '192.168.1.51', '2026-07-27 10:15:00+05:30');

INSERT INTO dashboard_cache (academy_id, metric_key, metric_value, dimension, dimension_id, raw_data, cached_until)
VALUES
('a1111111-1111-1111-1111-111111111111', 'total_students', 2, 'overall', NULL, '{}'::jsonb, NOW() + INTERVAL '1 hour'),
('a1111111-1111-1111-1111-111111111111', 'total_teachers', 2, 'overall', NULL, '{}'::jsonb, NOW() + INTERVAL '1 hour'),
('a1111111-1111-1111-1111-111111111111', 'revenue_monthly', 180000.00, 'overall', NULL, '{"currency": "INR", "breakdowns": {"tuition": 180000.00}}'::jsonb, NOW() + INTERVAL '1 hour');
