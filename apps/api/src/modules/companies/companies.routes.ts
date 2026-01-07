import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompanyWithPasswordConfirmation,
  createFirstAdmin,
} from './companies.service';
import { hashPassword } from '../../lib/password';

export const companyRoutes = new Hono();

// Validation schemas
const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  defaultStandard: z.enum(['NETA', 'MICROSOFT']).optional(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY']).optional(),
  tokenBalance: z.number().optional(),
});

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().optional(),
  defaultStandard: z.enum(['NETA', 'MICROSOFT']).optional(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY']).optional(),
});

const deleteCompanySchema = z.object({
  password: z.string().min(1, 'Password is required for confirmation'),
});

const createFirstAdminSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// GET /api/companies - List all companies (SUPER_ADMIN only)
companyRoutes.get('/', requireAuth, requireRole('SUPER_ADMIN'), async (c) => {
  try {
    const companies = await getAllCompanies();
    return c.json({ companies });
  } catch (error) {
    console.error('Error getting companies:', error);
    return c.json({ error: 'Failed to get companies' }, 500);
  }
});

// GET /api/companies/:id - Get company details (authenticated users)
companyRoutes.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  try {
    const company = await getCompanyById(id);

    if (!company) {
      return c.json({ error: 'Company not found' }, 404);
    }

    // Non-super admins can only access their own company
    if (user.role !== 'SUPER_ADMIN' && user.companyId !== id) {
      return c.json({ error: 'Forbidden', message: 'Cannot access other companies' }, 403);
    }

    return c.json({ company });
  } catch (error) {
    console.error('Error getting company:', error);
    return c.json({ error: 'Failed to get company' }, 500);
  }
});

// PUT /api/companies/:id - Update company (ADMIN only)
companyRoutes.put('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  try {
    const body = await c.req.json();
    const validation = updateCompanySchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: 'Validation Error', message: validation.error.issues[0].message }, 400);
    }

    // Non-super admins can only update their own company
    if (user.role !== 'SUPER_ADMIN' && user.companyId !== id) {
      return c.json({ error: 'Forbidden', message: 'Cannot update other companies' }, 403);
    }

    const company = await updateCompany(id, validation.data);
    return c.json({ company });
  } catch (error) {
    console.error('Error updating company:', error);
    return c.json({ error: 'Failed to update company' }, 500);
  }
});

// Schema for logo upload
const logoUploadSchema = z.object({
  imageData: z.string().min(1, 'Image data is required'), // Base64 encoded image
  filename: z.string().min(1, 'Filename is required'),
});

// POST /api/companies/:id/logo - Upload company logo (ADMIN only)
companyRoutes.post('/:id/logo', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  try {
    // Non-super admins can only update their own company
    if (user.role !== 'SUPER_ADMIN' && user.companyId !== id) {
      return c.json({ error: 'Forbidden', message: 'Cannot upload logo for other companies' }, 403);
    }

    const body = await c.req.json();
    const validation = logoUploadSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: 'Validation Error', message: validation.error.issues[0].message }, 400);
    }

    const { filename } = validation.data;

    // Simulate R2 upload - in production this would upload to R2 and return the URL
    // For development, we'll generate a simulated URL
    const timestamp = Date.now();
    const extension = filename.split('.').pop() || 'png';
    const simulatedUrl = `/uploads/logos/${id}-${timestamp}.${extension}`;

    // Update company with the logo URL
    const company = await updateCompany(id, { logoUrl: simulatedUrl });

    return c.json({
      success: true,
      message: 'Logo uploaded successfully',
      logoUrl: company.logoUrl,
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    return c.json({ error: 'Failed to upload logo' }, 500);
  }
});

// POST /api/companies - Create company (SUPER_ADMIN only)
companyRoutes.post('/', requireAuth, requireRole('SUPER_ADMIN'), async (c) => {
  try {
    const body = await c.req.json();
    const validation = createCompanySchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: 'Validation Error', message: validation.error.issues[0].message }, 400);
    }

    const company = await createCompany(validation.data);
    return c.json({ company }, 201);
  } catch (error) {
    console.error('Error creating company:', error);
    return c.json({ error: 'Failed to create company' }, 500);
  }
});

// DELETE /api/companies/:id - Delete company (SUPER_ADMIN only, requires password confirmation)
companyRoutes.delete('/:id', requireAuth, requireRole('SUPER_ADMIN'), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  try {
    const body = await c.req.json();
    const validation = deleteCompanySchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: 'Validation Error', message: validation.error.issues[0].message }, 400);
    }

    await deleteCompanyWithPasswordConfirmation(id, user.userId, validation.data.password);
    return c.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete company';

    // Return appropriate status code based on error
    if (message === 'Invalid password') {
      return c.json({ error: 'Forbidden', message: 'Invalid password' }, 403);
    }
    if (message === 'Company not found') {
      return c.json({ error: 'Not Found', message: 'Company not found' }, 404);
    }

    return c.json({ error: 'Failed', message }, 500);
  }
});

// POST /api/companies/:id/admin - Create first admin for a company (SUPER_ADMIN only)
companyRoutes.post('/:id/admin', requireAuth, requireRole('SUPER_ADMIN'), async (c) => {
  const companyId = c.req.param('id');

  try {
    const body = await c.req.json();
    const validation = createFirstAdminSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: 'Validation Error', message: validation.error.issues[0].message }, 400);
    }

    const { email, name, password } = validation.data;
    const passwordHash = await hashPassword(password);

    const user = await createFirstAdmin(companyId, { email, name, passwordHash });

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
      },
    }, 201);
  } catch (error) {
    console.error('Error creating first admin:', error);
    const message = error instanceof Error ? error.message : 'Failed to create admin';
    return c.json({ error: 'Failed', message }, 400);
  }
});
