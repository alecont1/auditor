/**
 * Check audit logs in database
 */

import { prisma } from '../src/lib/prisma';

async function main() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  console.log('=== Recent Audit Logs ===\n');
  console.log(`Total: ${logs.length} entries\n`);

  for (const log of logs) {
    console.log(`[${log.createdAt.toISOString()}] ${log.action}`);
    console.log(`  User: ${log.user.email}`);
    console.log(`  Entity: ${log.entityType} (${log.entityId.substring(0, 20)}...)`);
    console.log(`  IP: ${log.ipAddress || 'N/A'}`);
    if (log.details) {
      console.log(`  Details: ${log.details}`);
    }
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
