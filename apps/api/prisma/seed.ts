import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test company
  const company = await prisma.company.upsert({
    where: { id: 'test-company-1' },
    update: {},
    create: {
      id: 'test-company-1',
      name: 'Test Company',
      defaultStandard: 'NETA',
      tokenBalance: 100000,
    },
  });

  console.log('Created company:', company.name);

  // Create a SUPER_ADMIN user (no company)
  const superAdminPassword = await hashPassword('admin123');
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@auditeng.com' },
    update: {},
    create: {
      email: 'superadmin@auditeng.com',
      passwordHash: superAdminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      companyId: null,
    },
  });

  console.log('Created super admin:', superAdmin.email);

  // Create an ADMIN user for the test company
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@testcompany.com' },
    update: {},
    create: {
      email: 'admin@testcompany.com',
      passwordHash: adminPassword,
      name: 'Test Admin',
      role: 'ADMIN',
      companyId: company.id,
    },
  });

  console.log('Created admin:', admin.email);

  // Create an ANALYST user for the test company
  const analystPassword = await hashPassword('analyst123');
  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@testcompany.com' },
    update: {},
    create: {
      email: 'analyst@testcompany.com',
      passwordHash: analystPassword,
      name: 'Test Analyst',
      role: 'ANALYST',
      companyId: company.id,
    },
  });

  console.log('Created analyst:', analyst.email);

  console.log('');
  console.log('✅ Seed completed!');
  console.log('');
  console.log('📝 Test credentials:');
  console.log('');
  console.log('Super Admin:');
  console.log('  Email: superadmin@auditeng.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('Admin:');
  console.log('  Email: admin@testcompany.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('Analyst:');
  console.log('  Email: analyst@testcompany.com');
  console.log('  Password: analyst123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
