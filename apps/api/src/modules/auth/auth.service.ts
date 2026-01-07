import { prisma } from '../../lib/prisma';
import { createToken, TokenPayload } from '../../lib/jwt';
import { verifyPassword, hashPassword, validatePassword } from '../../lib/password';

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'ANALYST';
    companyId: string | null;
  };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Create JWT token
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };

  const token = await createToken(tokenPayload);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    },
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Validate new password
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    throw new Error(validation.message || 'Invalid password');
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const newPasswordHash = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      emailNotifications: true,
      createdAt: true,
      lastLoginAt: true,
      company: {
        select: {
          id: true,
          name: true,
          tokenBalance: true,
        },
      },
    },
  });

  return user;
}

export async function validateInvitationToken(token: string) {
  const invitation = await prisma.invitation.findFirst({
    where: {
      token,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      company: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  return invitation;
}

export async function acceptInvitation(
  token: string,
  name: string,
  password: string
) {
  // Validate the invitation
  const invitation = await prisma.invitation.findFirst({
    where: {
      token,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Check if user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  });

  if (existingUser) {
    throw new Error('A user with this email already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user and mark invitation as accepted in a transaction
  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invitation.email,
        name,
        passwordHash,
        role: invitation.role,
        companyId: invitation.companyId,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  return user;
}
