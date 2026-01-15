import { prisma } from '../../lib/prisma.js';
import { randomBytes } from 'crypto';

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  createdAt: Date;
}

export async function getUsersByCompanyId(companyId: string): Promise<UserListItem[]> {
  // Get active users for this company
  const users = await prisma.user.findMany({
    where: { companyId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get pending invitations for this company
  const pendingInvitations = await prisma.invitation.findMany({
    where: {
      companyId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  // Combine users and pending invitations
  const userList: UserListItem[] = [
    ...users.map((user: typeof users[number]) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: 'ACTIVE' as const,
      createdAt: user.createdAt,
    })),
    ...pendingInvitations.map((inv: typeof pendingInvitations[number]) => ({
      id: inv.id,
      email: inv.email,
      name: null,
      role: inv.role,
      status: 'PENDING' as const,
      createdAt: inv.createdAt,
    })),
  ];

  return userList;
}

export async function createInvitation(
  email: string,
  role: string,
  companyId: string,
  invitedById: string
): Promise<{ invitation: { id: string; email: string; role: string }; token: string }> {
  // Check if user already exists in this company
  const existingUser = await prisma.user.findFirst({
    where: { email, companyId },
  });

  if (existingUser) {
    throw new Error('User with this email already exists in this company');
  }

  // Check if there's already a pending invitation
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email,
      companyId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    throw new Error('An invitation has already been sent to this email');
  }

  // Generate token
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create invitation
  const invitation = await prisma.invitation.create({
    data: {
      email,
      role,
      companyId,
      invitedById,
      token,
      expiresAt,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  return { invitation, token };
}

export async function deleteUser(userId: string, companyId: string): Promise<void> {
  // First check if this is a pending invitation
  const invitation = await prisma.invitation.findFirst({
    where: { id: userId, companyId },
  });

  if (invitation) {
    await prisma.invitation.delete({ where: { id: userId } });
    return;
  }

  // Check if user exists and belongs to the company
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Cannot delete the last admin
  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { companyId, role: 'ADMIN' },
    });

    if (adminCount <= 1) {
      throw new Error('Cannot delete the last admin user');
    }
  }

  await prisma.user.delete({ where: { id: userId } });
}

export async function updateUser(
  userId: string,
  companyId: string,
  data: { name?: string; emailNotifications?: boolean }
): Promise<{ id: string; name: string | null; email: string; emailNotifications: boolean }> {
  // Check if user exists and belongs to the company
  const user = await prisma.user.findFirst({
    where: { id: userId, companyId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Build update data
  const updateData: { name?: string; emailNotifications?: boolean } = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.emailNotifications !== undefined) updateData.emailNotifications = data.emailNotifications;

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      emailNotifications: true,
    },
  });

  return updatedUser;
}
