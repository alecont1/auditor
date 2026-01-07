import { prisma } from '../../lib/prisma';
import { verifyPassword } from '../../lib/password';

export interface Company {
  id: string;
  name: string;
  logoUrl: string | null;
  defaultStandard: string;
  tokenBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all companies (for Super Admin)
 */
export async function getAllCompanies(): Promise<Company[]> {
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { users: true, analyses: true },
      },
    },
  });

  return companies;
}

/**
 * Get a company by ID
 */
export async function getCompanyById(companyId: string): Promise<Company | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  return company;
}

/**
 * Create a new company (Super Admin only)
 */
export async function createCompany(data: {
  name: string;
  defaultStandard?: string;
  tokenBalance?: number;
}): Promise<Company> {
  const company = await prisma.company.create({
    data: {
      name: data.name,
      defaultStandard: data.defaultStandard || 'NETA',
      tokenBalance: data.tokenBalance || 0,
    },
  });

  return company;
}

/**
 * Update a company
 */
export async function updateCompany(
  companyId: string,
  data: {
    name?: string;
    logoUrl?: string;
    defaultStandard?: string;
  }
): Promise<Company> {
  const company = await prisma.company.update({
    where: { id: companyId },
    data,
  });

  return company;
}

/**
 * Delete a company with password confirmation
 * This is a sensitive operation that requires the user's password
 */
export async function deleteCompanyWithPasswordConfirmation(
  companyId: string,
  userId: string,
  password: string
): Promise<void> {
  // First, verify the user's password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify the password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  // Check if the company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error('Company not found');
  }

  // Delete the company (cascades to users, analyses, etc. based on schema)
  await prisma.company.delete({
    where: { id: companyId },
  });
}

/**
 * Create the first admin user for a company (Super Admin only)
 */
export async function createFirstAdmin(
  companyId: string,
  data: {
    email: string;
    name: string;
    passwordHash: string;
  }
) {
  // Verify the company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new Error('Company not found');
  }

  // Check if company already has users
  const existingUsers = await prisma.user.count({
    where: { companyId },
  });

  if (existingUsers > 0) {
    throw new Error('Company already has users');
  }

  // Create the admin user
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      name: data.name,
      passwordHash: data.passwordHash,
      role: 'ADMIN',
      companyId,
    },
  });

  return user;
}
