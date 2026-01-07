# AuditEng

AuditEng is an automated validation system for electrical commissioning reports targeting mission-critical data centers (Microsoft, Google, AWS). The system analyzes PDF reports using AI (Claude API) to extract structured data, then applies deterministic validation against technical standards (NETA ATS-2021, IEEE, Microsoft CxPOR) to issue automatic verdicts with 98%+ accuracy and less than 2% false positives.

## Features

- **AI-Powered PDF Analysis**: Extracts structured data from commissioning reports using Claude API
- **Multi-Test Type Support**: Grounding, Megger (Insulation Resistance), and Thermography tests
- **Deterministic Validation**: Applies NETA ATS-2021, IEEE, and Microsoft CxPOR standards
- **Automatic Verdicts**: APPROVED, APPROVED_WITH_COMMENTS, or REJECTED with confidence scores
- **Multi-Tenant SaaS**: Complete data isolation with role-based access control
- **Token-Based Billing**: Stripe integration for token package purchases

## Technology Stack

### Frontend
- React 18 + Vite + TypeScript
- TailwindCSS + shadcn/ui
- React Context + localStorage for state

### Backend
- Bun runtime
- Hono + TypeScript 5
- PostgreSQL 15 + Prisma ORM
- Redis for caching
- Cloudflare R2 for PDF storage

### External Services
- Anthropic Claude API (for extraction)
- Stripe (for payments)

## Prerequisites

- Node.js 18+
- Bun runtime
- pnpm package manager
- PostgreSQL 15 database
- Redis instance
- Cloudflare R2 bucket
- Anthropic API key
- Stripe account with API keys

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd auditeng
   ```

2. **Run the setup script**
   ```bash
   ./init.sh
   ```

3. **Configure environment variables**

   Edit `.env` with your actual values:
   - Database connection string
   - Redis URL
   - Anthropic API key
   - Stripe keys
   - Cloudflare R2 credentials

4. **Start development servers**
   ```bash
   pnpm dev
   ```

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run API (3001) + Web (3000) |
| `pnpm dev:api` | Backend only |
| `pnpm dev:web` | Frontend only |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm build` | Production build |
| `pnpm test` | Run all tests |
| `pnpm lint` | Code verification |

## Project Structure

```
auditeng/
├── apps/
│   ├── api/                    # Backend (Hono + Bun)
│   │   ├── src/
│   │   │   ├── index.ts        # Entry point
│   │   │   ├── modules/        # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── companies/
│   │   │   │   ├── analysis/
│   │   │   │   ├── tokens/
│   │   │   │   └── ai/         # AI extractors & validators
│   │   │   ├── lib/            # Shared utilities
│   │   │   └── prisma/         # Database schema
│   │   └── package.json
│   │
│   └── web/                    # Frontend (React + Vite)
│       ├── src/
│       │   ├── pages/          # Page components
│       │   ├── components/     # UI components
│       │   ├── lib/            # Utilities
│       │   └── hooks/          # Custom hooks
│       └── package.json
│
├── packages/                   # Shared packages (if any)
├── init.sh                     # Setup script
├── pnpm-workspace.yaml         # pnpm workspace config
└── package.json                # Root package.json
```

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| SUPER_ADMIN | System owner | Create/manage companies, access all tenants |
| ADMIN | Company administrator | Manage users, purchase tokens, configure settings |
| ANALYST | Regular user | Upload/analyze PDFs, export results |

## Test Types

### Grounding Test
- Ground resistance values
- Calibration certificate validation
- Watermark detection
- Technician signature verification

### Megger Test (Insulation Resistance)
- 6 mandatory combinations (RxS, RxT, SxT, RxMASS, SxMASS, TxMASS)
- Insulation resistance values
- Absorption index calculation
- Test voltage verification

### Thermography Test
- Temperature differentials (delta T)
- Load readings (min/max)
- Ambient/reflected temperature
- Phase-to-phase analysis

## Validation Standards

- **NETA ATS-2021**: Default acceptance criteria
- **IEEE Standards**: Additional technical requirements
- **Microsoft CxPOR**: Most restrictive, for Microsoft data centers

## Token Packages

| Package | Tokens | Price |
|---------|--------|-------|
| Starter | 50,000 | $25 |
| Basic | 150,000 | $65 |
| Professional | 400,000 | $150 |
| Business | 1,000,000 | $350 |
| Enterprise | 3,000,000 | $900 |

## API Endpoints

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/change-password`

### Analysis
- `POST /api/analysis` - Upload and start analysis
- `GET /api/analysis` - List analyses
- `GET /api/analysis/:id` - Get analysis detail
- `GET /api/analysis/:id/export` - Export (JSON/CSV)
- `POST /api/analysis/:id/reanalyze` - Re-analyze

### Tokens
- `GET /api/tokens/balance`
- `GET /api/tokens/transactions`
- `POST /api/tokens/checkout`
- `GET /api/tokens/packages`

## Contributing

1. Follow the existing code patterns
2. Write tests for new features
3. Ensure no data leakage between tenants
4. Use TypeScript strict mode

## License

Proprietary - All rights reserved
