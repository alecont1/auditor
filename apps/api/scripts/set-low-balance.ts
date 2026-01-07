import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a company with very low token balance for testing
  const lowTokenCompany = await prisma.company.upsert({
    where: { id: 'low-token-company' },
    update: {
      tokenBalance: 500, // Set very low balance - below 1000 minimum
    },
    create: {
      id: 'low-token-company',
      name: 'Low Token Test Company',
      defaultStandard: 'NETA',
      tokenBalance: 500, // Very low - below 1000 minimum for analysis
    },
  });

  console.log('Created/updated company:', lowTokenCompany.name, 'with balance:', lowTokenCompany.tokenBalance);

  // Create an admin user for this company
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'lowtoken@testcompany.com' },
    update: {},
    create: {
      email: 'lowtoken@testcompany.com',
      passwordHash,
      name: 'Low Token Admin',
      role: 'ADMIN',
      companyId: lowTokenCompany.id,
    },
  });

  console.log('Created/updated user:', admin.email);
  console.log('');
  console.log('Test credentials:');
  console.log('  Email: lowtoken@testcompany.com');
  console.log('  Password: admin123');
  console.log('  Token Balance: 500 tokens');
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
