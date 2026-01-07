import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('analyst123', 10);

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst_b@testcompany.com' },
    update: {},
    create: {
      email: 'analyst_b@testcompany.com',
      passwordHash,
      name: 'Analyst B',
      role: 'ANALYST',
      companyId: 'test-company-1',
    },
  });

  console.log('Created Analyst B:', analyst.email);
}

main().then(() => prisma.$disconnect());
