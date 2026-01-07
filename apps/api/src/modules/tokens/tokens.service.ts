import { prisma } from '../../lib/prisma';

export interface TokenTransaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  analysisId: string | null;
  createdAt: Date;
}

export async function getTokenBalance(companyId: string): Promise<number> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tokenBalance: true },
  });
  return company?.tokenBalance ?? 0;
}

export async function getTransactionHistory(
  companyId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ transactions: TokenTransaction[]; total: number }> {
  const where = { companyId };

  const [transactions, total] = await Promise.all([
    prisma.tokenTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      select: {
        id: true,
        type: true,
        amount: true,
        balance: true,
        description: true,
        analysisId: true,
        createdAt: true,
      },
    }),
    prisma.tokenTransaction.count({ where }),
  ]);

  return { transactions, total };
}

export async function consumeTokens(
  companyId: string,
  userId: string,
  amount: number,
  analysisId: string,
  description: string
): Promise<TokenTransaction> {
  // Get current balance
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tokenBalance: true },
  });

  if (!company) {
    throw new Error('Company not found');
  }

  const currentBalance = company.tokenBalance;
  const newBalance = currentBalance - amount;

  if (newBalance < 0) {
    throw new Error('Insufficient token balance');
  }

  // Create transaction and update balance in a transaction
  const [transaction] = await prisma.$transaction([
    prisma.tokenTransaction.create({
      data: {
        companyId,
        userId,
        type: 'CONSUMPTION',
        amount: -amount, // Negative for consumption
        balance: newBalance,
        analysisId,
        description,
      },
    }),
    prisma.company.update({
      where: { id: companyId },
      data: { tokenBalance: newBalance },
    }),
  ]);

  return transaction;
}

export async function addTokens(
  companyId: string,
  userId: string,
  amount: number,
  description: string,
  packageName?: string,
  stripeSessionId?: string
): Promise<TokenTransaction> {
  // Get current balance
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { tokenBalance: true },
  });

  if (!company) {
    throw new Error('Company not found');
  }

  const newBalance = company.tokenBalance + amount;

  // Create transaction and update balance in a transaction
  const [transaction] = await prisma.$transaction([
    prisma.tokenTransaction.create({
      data: {
        companyId,
        userId,
        type: 'PURCHASE',
        amount, // Positive for purchase
        balance: newBalance,
        description,
        packageName,
        stripeSessionId,
      },
    }),
    prisma.company.update({
      where: { id: companyId },
      data: { tokenBalance: newBalance },
    }),
  ]);

  return transaction;
}
