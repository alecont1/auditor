/**
 * Test script for audit logging feature
 * Run with: pnpm tsx scripts/test-audit-log.ts
 */

import { prisma } from '../src/lib/prisma';

async function testAuditLog() {
  console.log('=== Testing Audit Log Feature ===\n');

  // Get a user for testing
  const user = await prisma.user.findFirst({
    where: { email: 'admin@testcompany.com' },
    include: { company: true },
  });

  if (!user) {
    console.log('Test user not found. Creating test data...');
    return;
  }

  console.log(`Test user: ${user.email} (${user.role})`);
  console.log(`Company: ${user.company?.name || 'N/A'}\n`);

  // Create some test audit log entries
  console.log('Creating test audit log entries...\n');

  // Simulate login log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      companyId: user.companyId,
      action: 'LOGIN',
      entityType: 'SESSION',
      entityId: user.id,
      details: JSON.stringify({ email: user.email }),
      ipAddress: '127.0.0.1',
    },
  });
  console.log('✓ Created LOGIN audit log');

  // Simulate analysis creation log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      companyId: user.companyId,
      action: 'ANALYSIS_CREATED',
      entityType: 'ANALYSIS',
      entityId: 'test-analysis-id',
      details: JSON.stringify({ filename: 'test.pdf', testType: 'GROUNDING' }),
      ipAddress: '127.0.0.1',
    },
  });
  console.log('✓ Created ANALYSIS_CREATED audit log');

  // Simulate profile update log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      companyId: user.companyId,
      action: 'PROFILE_UPDATED',
      entityType: 'USER',
      entityId: user.id,
      details: JSON.stringify({ updatedFields: ['name'] }),
      ipAddress: '127.0.0.1',
    },
  });
  console.log('✓ Created PROFILE_UPDATED audit log');

  // Simulate logout log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      companyId: user.companyId,
      action: 'LOGOUT',
      entityType: 'SESSION',
      entityId: user.id,
      ipAddress: '127.0.0.1',
    },
  });
  console.log('✓ Created LOGOUT audit log');

  // Fetch and display all audit logs for this company
  console.log('\n=== Audit Logs for Company ===\n');

  const logs = await prisma.auditLog.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  for (const log of logs) {
    console.log(`[${log.createdAt.toISOString()}] ${log.action}`);
    console.log(`  User: ${log.user.email}`);
    console.log(`  Entity: ${log.entityType} (${log.entityId})`);
    console.log(`  IP: ${log.ipAddress || 'N/A'}`);
    if (log.details) {
      console.log(`  Details: ${log.details}`);
    }
    console.log('');
  }

  console.log(`Total logs found: ${logs.length}`);
  console.log('\n=== Test Complete ===');
}

testAuditLog()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
