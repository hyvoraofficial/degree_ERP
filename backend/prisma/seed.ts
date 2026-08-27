import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environmental variables
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
  console.log('Production initialization seed started...');

  const academyId = 'a1111111-1111-1111-1111-111111111111';
  const roleAdminId = 'e2222222-2222-2222-2222-222222222222';
  const roleTeacherId = 'e3333333-3333-3333-3333-333333333333';
  const roleStudentId = 'e4444444-4444-4444-4444-444444444444';

  // NOTE: Hyvora Academy is demonstration seed data and is not a production tenant assumption.
  // 1. Production Academy Setup
  const academy = await prisma.academy.upsert({
    where: { id: academyId },
    update: {},
    create: {
      id: academyId,
      name: 'Hyvora Academy',
      subdomain: 'hyvora',
      domain: 'hyvora.edu',
      status: 'active',
    },
  });

  // 2. Academy Settings
  await prisma.academySetting.upsert({
    where: { academyId },
    update: {},
    create: {
      id: 'a2222222-2222-2222-2222-222222222222',
      academyId,
      primaryColor: '#4F46E5',
      secondaryColor: '#06B6D4',
      address: '123 Science Park Drive, Tech City, Karnataka, India',
      phone: '+91-9876543210',
      email: 'info@hyvora.com',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      theme: 'system',
    },
  });

  // 3. System RBAC Roles
  const roles = [
    { id: 'e1111111-1111-1111-1111-111111111111', name: 'Super Admin', code: 'SUPER_ADMIN', description: 'Global Super Administrator', isSystem: true, academyId: null },
    { id: roleAdminId, name: 'Academy Admin', code: 'ACADEMY_ADMIN', description: 'Academy Administrator', isSystem: true, academyId },
    { id: roleTeacherId, name: 'Teacher', code: 'TEACHER', description: 'Academic staff', isSystem: true, academyId },
    { id: roleStudentId, name: 'Student', code: 'STUDENT', description: 'Enrolled academic learner', isSystem: true, academyId },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description,
        isSystem: r.isSystem,
        academyId: r.academyId,
      },
    });
  }

  // 4. System Permissions Catalog
  const permissions = [
    { id: 'f0111111-1111-1111-1111-111111111111', name: 'Create Users', code: 'users:create', description: 'Create user accounts', resource: 'users', action: 'create' },
    { id: 'f0222222-2222-2222-2222-222222222222', name: 'Read Users', code: 'users:read', description: 'View user accounts', resource: 'users', action: 'read' },
    { id: 'f0333333-3333-3333-3333-333333333333', name: 'Update Users', code: 'users:update', description: 'Edit user accounts', resource: 'users', action: 'update' },
    { id: 'f0444444-4444-4444-4444-444444444444', name: 'Delete Users', code: 'users:delete', description: 'Soft delete user accounts', resource: 'users', action: 'delete' },
    { id: 'f0555555-5555-5555-5555-555555555555', name: 'Read Students', code: 'students:read', description: 'View student profiles', resource: 'students', action: 'read' },
    { id: 'f0666666-6666-6666-6666-666666666666', name: 'Edit Students', code: 'students:update', description: 'Update student profiles', resource: 'students', action: 'update' },
    { id: 'f0777777-7777-7777-7777-777755555555', name: 'Mark Attendance', code: 'attendance:create', description: 'Record batch attendance', resource: 'attendance', action: 'create' },
    { id: 'f0888888-8888-8888-8888-888855555555', name: 'Read Attendance', code: 'attendance:read', description: 'View attendance sheets', resource: 'attendance', action: 'read' },
    { id: 'f0999999-9999-9999-9999-999955555555', name: 'Manage Fees', code: 'fees:manage', description: 'Configure fee categories and allocations', resource: 'fees', action: 'manage' },
    { id: 'f1010101-1010-1010-1010-101055555555', name: 'Process Payments', code: 'payments:create', description: 'Log student fees transactions', resource: 'payments', action: 'create' },
    { id: 'f1111112-1112-1112-1112-111255555555', name: 'Manage Assignments', code: 'assignments:manage', description: 'Configure homework assignments', resource: 'assignments', action: 'manage' },
    { id: 'f1212122-1212-1212-1212-121255555555', name: 'Grade Submissions', code: 'submissions:grade', description: 'Grade student assignment entries', resource: 'submissions', action: 'grade' },
    { id: 'f1313133-1313-1313-1313-131355555555', name: 'Create Branches', code: 'branches:create', description: 'Create new branches', resource: 'branches', action: 'create' },
    { id: 'f1414144-1414-1414-1414-141455555555', name: 'Read Branches', code: 'branches:read', description: 'Read branch profiles', resource: 'branches', action: 'read' },
    { id: 'f1515155-1515-1515-1515-151555555555', name: 'Update Branches', code: 'branches:update', description: 'Edit branch profiles', resource: 'branches', action: 'update' },
    { id: 'f1616166-1616-1616-1616-161655555555', name: 'Delete Branches', code: 'branches:delete', description: 'Soft delete branches', resource: 'branches', action: 'delete' },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        name: p.name,
        code: p.code,
        description: p.description,
        resource: p.resource,
        action: p.action,
      },
    });
  }

  // 5. Map Permissions to Admin Role
  for (const p of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        uq_role_permission: {
          roleId: roleAdminId,
          permissionId: p.id,
        },
      },
      update: {},
      create: {
        academyId,
        roleId: roleAdminId,
        permissionId: p.id,
      },
    });
  }

  // 6. Map Permissions to Teacher Role
  const teacherPermIds = [
    'f0222222-2222-2222-2222-222222222222',
    'f0555555-5555-5555-5555-555555555555',
    'f0777777-7777-7777-7777-777755555555',
    'f0888888-8888-8888-8888-888855555555',
    'f1111112-1112-1112-1112-111255555555',
    'f1212122-1212-1212-1212-121255555555',
  ];

  for (const pid of teacherPermIds) {
    await prisma.rolePermission.upsert({
      where: {
        uq_role_permission: {
          roleId: roleTeacherId,
          permissionId: pid,
        },
      },
      update: {},
      create: {
        academyId,
        roleId: roleTeacherId,
        permissionId: pid,
      },
    });
  }

  // 7. Primary Admin Account Creation (Only Admin account seeded for production management)
  const hashedPassword = await bcrypt.hash('admin', 10);
  const adminUserId = '11111111-1111-1111-1111-111111111111';

  await prisma.user.upsert({
    where: { id: adminUserId },
    update: {},
    create: {
      id: adminUserId,
      academyId,
      email: 'admin@hyvora.com',
      passwordHash: hashedPassword,
      firstName: 'Hyvora',
      lastName: 'Admin',
      phone: '+91-9876543210',
      status: 'active',
      isEmailVerified: true,
      isDefaultPassword: false,
    },
  });

  await prisma.userRole.upsert({
    where: { uq_user_role: { userId: adminUserId, roleId: roleAdminId } },
    update: {},
    create: {
      academyId,
      userId: adminUserId,
      roleId: roleAdminId,
    },
  });

  console.log('Production setup completed. Admin account initialized.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
