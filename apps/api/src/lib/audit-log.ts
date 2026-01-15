/**
 * Audit logging service for tracking user actions
 * All significant user actions should be logged for compliance and security
 */

import { prisma } from './prisma.js';
import type { Context } from 'hono';

// Audit action types
export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'ANALYSIS_CREATED'
  | 'ANALYSIS_DELETED'
  | 'ANALYSIS_REANALYZED'
  | 'PROFILE_UPDATED'
  | 'PASSWORD_CHANGED'
  | 'USER_INVITED'
  | 'USER_DELETED'
  | 'COMPANY_CREATED'
  | 'COMPANY_DELETED'
  | 'FEEDBACK_SUBMITTED';

// Entity types for grouping logs
export type EntityType = 'USER' | 'ANALYSIS' | 'COMPANY' | 'SESSION';

interface AuditLogInput {
  userId: string;
  companyId?: string | null;
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(c: Context): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    c.req.header('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Create an audit log entry
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        companyId: input.companyId || null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: (input.details as object) || undefined,
        ipAddress: input.ipAddress || null,
      },
    });
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Get audit logs for a company (SUPER_ADMIN or company ADMIN)
 */
export async function getAuditLogs(
  companyId: string | null,
  options?: {
    limit?: number;
    offset?: number;
    userId?: string;
    action?: AuditAction;
  }
) {
  const where: Record<string, unknown> = {};

  if (companyId) {
    where.companyId = companyId;
  }

  if (options?.userId) {
    where.userId = options.userId;
  }

  if (options?.action) {
    where.action = options.action;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return logs;
}
