import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
async function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
async function main() {
    console.log('🌱 Seeding database...');
    // Create a test company
    const company = await prisma.company.upsert({
        where: { id: 'test-company-1' },
        update: {},
        create: {
            id: 'test-company-1',
            name: 'Test Company',
            defaultStandard: 'NETA',
            tokenBalance: 100000,
        },
    });
    console.log('Created company:', company.name);
    // Create a SUPER_ADMIN user (no company)
    const superAdminPassword = await hashPassword('admin123');
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@auditeng.com' },
        update: {},
        create: {
            email: 'superadmin@auditeng.com',
            passwordHash: superAdminPassword,
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            companyId: null,
        },
    });
    console.log('Created super admin:', superAdmin.email);
    // Create an ADMIN user for the test company
    const adminPassword = await hashPassword('admin123');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@testcompany.com' },
        update: {},
        create: {
            email: 'admin@testcompany.com',
            passwordHash: adminPassword,
            name: 'Test Admin',
            role: 'ADMIN',
            companyId: company.id,
        },
    });
    console.log('Created admin:', admin.email);
    // Create an ANALYST user for the test company
    const analystPassword = await hashPassword('analyst123');
    const analyst = await prisma.user.upsert({
        where: { email: 'analyst@testcompany.com' },
        update: {},
        create: {
            email: 'analyst@testcompany.com',
            passwordHash: analystPassword,
            name: 'Test Analyst',
            role: 'ANALYST',
            companyId: company.id,
        },
    });
    console.log('Created analyst:', analyst.email);
    // Create a SECOND test company for cross-tenant testing
    const company2 = await prisma.company.upsert({
        where: { id: 'test-company-2' },
        update: {},
        create: {
            id: 'test-company-2',
            name: 'Other Company',
            defaultStandard: 'MICROSOFT',
            tokenBalance: 50000,
        },
    });
    console.log('Created company 2:', company2.name);
    // Create an ADMIN user for the second company
    const admin2Password = await hashPassword('admin123');
    const admin2 = await prisma.user.upsert({
        where: { email: 'admin@othercompany.com' },
        update: {},
        create: {
            email: 'admin@othercompany.com',
            passwordHash: admin2Password,
            name: 'Other Admin',
            role: 'ADMIN',
            companyId: company2.id,
        },
    });
    console.log('Created admin 2:', admin2.email);
    // Create a test analysis in Company 1 for cross-tenant testing
    const analysis1 = await prisma.analysis.upsert({
        where: { id: 'test-analysis-1' },
        update: {},
        create: {
            id: 'test-analysis-1',
            companyId: company.id,
            userId: admin.id,
            testType: 'GROUNDING',
            filename: 'test-grounding-report.pdf',
            pdfUrl: 'https://example.com/test.pdf',
            pdfSizeBytes: 1024000,
            status: 'COMPLETED',
            verdict: 'APPROVED',
            score: 95,
            overallConfidence: 0.92,
            tokensConsumed: 1500,
            processingTimeMs: 45000,
            standardUsed: 'NETA',
        },
    });
    console.log('Created test analysis:', analysis1.id);
    // Create a second analysis with unique filename for tenant isolation testing
    const analysis2 = await prisma.analysis.upsert({
        where: { id: 'test-analysis-2' },
        update: {},
        create: {
            id: 'test-analysis-2',
            companyId: company.id,
            userId: admin.id,
            testType: 'MEGGER',
            filename: 'COMPANY_A_TEST_123.pdf',
            pdfUrl: 'https://example.com/company-a-test.pdf',
            pdfSizeBytes: 2048000,
            status: 'COMPLETED',
            verdict: 'APPROVED_WITH_COMMENTS',
            score: 87,
            overallConfidence: 0.85,
            tokensConsumed: 2200,
            processingTimeMs: 55000,
            standardUsed: 'MICROSOFT',
        },
    });
    console.log('Created test analysis 2:', analysis2.id);
    // Create an analysis for Company 2
    const analysis3 = await prisma.analysis.upsert({
        where: { id: 'test-analysis-3' },
        update: {},
        create: {
            id: 'test-analysis-3',
            companyId: company2.id,
            userId: admin2.id,
            testType: 'THERMOGRAPHY',
            filename: 'company-b-thermal-scan.pdf',
            pdfUrl: 'https://example.com/company-b-test.pdf',
            pdfSizeBytes: 1536000,
            status: 'COMPLETED',
            verdict: 'APPROVED',
            score: 92,
            overallConfidence: 0.90,
            tokensConsumed: 1800,
            processingTimeMs: 40000,
            standardUsed: 'NETA',
        },
    });
    console.log('Created test analysis 3:', analysis3.id);
    console.log('');
    console.log('✅ Seed completed!');
    console.log('');
    console.log('📝 Test credentials:');
    console.log('');
    console.log('Super Admin:');
    console.log('  Email: superadmin@auditeng.com');
    console.log('  Password: admin123');
    console.log('');
    console.log('Company 1 - Test Company:');
    console.log('  Admin: admin@testcompany.com / admin123');
    console.log('  Analyst: analyst@testcompany.com / analyst123');
    console.log('');
    console.log('Company 2 - Other Company:');
    console.log('  Admin: admin@othercompany.com / admin123');
    console.log('');
    console.log('Test Data:');
    console.log('  Analysis ID: test-analysis-1 (belongs to Company 1)');
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
