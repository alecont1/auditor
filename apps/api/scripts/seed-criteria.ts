/**
 * Seed Analysis Criteria into RAG Knowledge Base
 *
 * This script indexes all technical standards, validation rules, and
 * acceptance criteria into the vector database for RAG-powered analysis.
 *
 * Run with: pnpm tsx scripts/seed-criteria.ts
 *
 * Options:
 *   --clear     Clear existing criteria before seeding
 *   --category  Index only specific category (GROUNDING, THERMOGRAPHY, MEGGER, UNIVERSAL)
 *   --testtype  Index criteria for specific test type (includes UNIVERSAL)
 *
 * Examples:
 *   pnpm tsx scripts/seed-criteria.ts                    # Index all criteria
 *   pnpm tsx scripts/seed-criteria.ts --clear            # Clear and re-index all
 *   pnpm tsx scripts/seed-criteria.ts --category GROUNDING  # Index only grounding
 *   pnpm tsx scripts/seed-criteria.ts --testtype THERMOGRAPHY  # Index thermography + universal
 */

import { prisma } from '../src/lib/prisma.js';
import {
  CriteriaIndexerService,
  type IndexingResult,
} from '../src/modules/rag/criteria-indexer.service.js';
import {
  ALL_CRITERIA,
  getCriteriaByCategory,
  getCriteriaByTestType,
  type CriteriaCategory,
} from '../src/modules/rag/criteria.data.js';
import type { TestType } from '../src/modules/rag/types.js';

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

interface CLIArgs {
  clear: boolean;
  category: CriteriaCategory | null;
  testType: TestType | null;
  help: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const result: CLIArgs = {
    clear: false,
    category: null,
    testType: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--clear' || arg === '-c') {
      result.clear = true;
    } else if (arg === '--category') {
      const value = args[++i]?.toUpperCase() as CriteriaCategory;
      if (['GROUNDING', 'THERMOGRAPHY', 'MEGGER', 'UNIVERSAL'].includes(value)) {
        result.category = value;
      } else {
        console.error(`Invalid category: ${value}`);
        console.error('Valid categories: GROUNDING, THERMOGRAPHY, MEGGER, UNIVERSAL');
        process.exit(1);
      }
    } else if (arg === '--testtype' || arg === '--test-type') {
      const value = args[++i]?.toUpperCase() as TestType;
      if (['GROUNDING', 'THERMOGRAPHY', 'MEGGER'].includes(value)) {
        result.testType = value;
      } else {
        console.error(`Invalid test type: ${value}`);
        console.error('Valid test types: GROUNDING, THERMOGRAPHY, MEGGER');
        process.exit(1);
      }
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Seed Analysis Criteria into RAG Knowledge Base

Usage: pnpm tsx scripts/seed-criteria.ts [options]

Options:
  --help, -h           Show this help message
  --clear, -c          Clear existing criteria before seeding
  --category <name>    Index only specific category
                       (GROUNDING, THERMOGRAPHY, MEGGER, UNIVERSAL)
  --testtype <name>    Index criteria for specific test type (includes UNIVERSAL)
                       (GROUNDING, THERMOGRAPHY, MEGGER)

Examples:
  pnpm tsx scripts/seed-criteria.ts
    Index all criteria documents

  pnpm tsx scripts/seed-criteria.ts --clear
    Clear existing and re-index all criteria

  pnpm tsx scripts/seed-criteria.ts --category GROUNDING
    Index only grounding criteria

  pnpm tsx scripts/seed-criteria.ts --testtype THERMOGRAPHY
    Index thermography + universal criteria

Criteria Counts:
  - UNIVERSAL:     ${getCriteriaByCategory('UNIVERSAL').length} documents
  - GROUNDING:     ${getCriteriaByCategory('GROUNDING').length} documents
  - THERMOGRAPHY:  ${getCriteriaByCategory('THERMOGRAPHY').length} documents
  - MEGGER:        ${getCriteriaByCategory('MEGGER').length} documents
  - TOTAL:         ${ALL_CRITERIA.length} documents
`);
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('  AuditEng - RAG Criteria Seeding');
  console.log('='.repeat(60));
  console.log('');

  const indexer = new CriteriaIndexerService();

  // Check database connection
  console.log('Checking database connection...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection: OK');
  } catch (error) {
    console.error('Database connection: FAILED');
    console.error('Make sure DATABASE_URL is set and the database is running.');
    process.exit(1);
  }

  // Check pgvector extension
  console.log('Checking pgvector extension...');
  try {
    type ExtResult = { extname: string }[];
    const result: ExtResult = await prisma.$queryRaw`
      SELECT extname FROM pg_extension WHERE extname = 'vector'
    `;
    if (result.length === 0) {
      console.error('pgvector extension not installed!');
      console.error('Run: CREATE EXTENSION IF NOT EXISTS vector;');
      process.exit(1);
    }
    console.log('pgvector extension: OK');
  } catch (error) {
    console.error('Failed to check pgvector extension:', error);
    process.exit(1);
  }

  console.log('');

  // Clear existing criteria if requested
  if (args.clear) {
    console.log('Clearing existing criteria...');
    if (args.category) {
      const { deleted } = await indexer.clearByCategory(args.category);
      console.log(`Deleted ${deleted} ${args.category} criteria entries`);
    } else {
      const { deleted } = await indexer.clearAllCriteria();
      console.log(`Deleted ${deleted} criteria entries`);
    }
    console.log('');
  }

  // Determine what to index
  let result: IndexingResult;

  if (args.category) {
    // Index by category
    const criteria = getCriteriaByCategory(args.category);
    console.log(`Indexing ${criteria.length} criteria for category: ${args.category}`);
    console.log('');

    result = await indexer.indexByCategory(args.category, (progress) => {
      const pct = ((progress.current / progress.total) * 100).toFixed(0);
      process.stdout.write(
        `\r  [${progress.current}/${progress.total}] ${pct}% - ${progress.currentId}: ${progress.currentTitle.slice(0, 40)}...`
      );
    });
  } else if (args.testType) {
    // Index by test type (includes UNIVERSAL)
    const criteria = getCriteriaByTestType(args.testType);
    console.log(`Indexing ${criteria.length} criteria for test type: ${args.testType}`);
    console.log('(Includes UNIVERSAL criteria)');
    console.log('');

    result = await indexer.indexByTestType(args.testType, (progress) => {
      const pct = ((progress.current / progress.total) * 100).toFixed(0);
      process.stdout.write(
        `\r  [${progress.current}/${progress.total}] ${pct}% - ${progress.currentId}: ${progress.currentTitle.slice(0, 40)}...`
      );
    });
  } else {
    // Index all
    console.log(`Indexing all ${ALL_CRITERIA.length} criteria documents`);
    console.log('');

    result = await indexer.indexAllCriteria((progress) => {
      const pct = ((progress.current / progress.total) * 100).toFixed(0);
      process.stdout.write(
        `\r  [${progress.current}/${progress.total}] ${pct}% - ${progress.currentId}: ${progress.currentTitle.slice(0, 40)}...`
      );
    });
  }

  // Clear the progress line
  console.log('\n');

  // Display results
  console.log('='.repeat(60));
  console.log('  Indexing Results');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  Status:        ${result.success ? 'SUCCESS' : 'PARTIAL FAILURE'}`);
  console.log(`  Indexed:       ${result.indexed} documents`);
  console.log(`  Failed:        ${result.failed} documents`);
  console.log(`  Tokens used:   ${result.tokensUsed.toLocaleString()}`);
  console.log(`  Duration:      ${(result.duration / 1000).toFixed(2)}s`);

  if (result.errors.length > 0) {
    console.log('');
    console.log('  Errors:');
    for (const error of result.errors.slice(0, 10)) {
      console.log(`    - ${error}`);
    }
    if (result.errors.length > 10) {
      console.log(`    ... and ${result.errors.length - 10} more errors`);
    }
  }

  console.log('');

  // Show knowledge base stats
  console.log('Knowledge Base Statistics:');
  type CountResult = { count: bigint };

  const totalCount: CountResult[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM knowledge_embeddings
  `;
  console.log(`  Total embeddings:     ${totalCount[0].count.toString()}`);

  const standardsCount: CountResult[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM knowledge_embeddings
    WHERE "contentType" = 'TECHNICAL_STANDARD'
  `;
  console.log(`  Technical standards:  ${standardsCount[0].count.toString()}`);

  const practicesCount: CountResult[] = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM knowledge_embeddings
    WHERE "contentType" = 'BEST_PRACTICE'
  `;
  console.log(`  Best practices:       ${practicesCount[0].count.toString()}`);

  type TestTypeResult = { testType: string; count: bigint }[];
  const byTestType: TestTypeResult = await prisma.$queryRaw`
    SELECT "testType", COUNT(*) as count
    FROM knowledge_embeddings
    WHERE "testType" IS NOT NULL
    GROUP BY "testType"
    ORDER BY count DESC
  `;
  if (byTestType.length > 0) {
    console.log('');
    console.log('  By Test Type:');
    for (const row of byTestType) {
      console.log(`    - ${row.testType}: ${row.count.toString()}`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('  Seeding Complete!');
  console.log('='.repeat(60));
  console.log('');

  // Exit with error code if there were failures
  if (!result.success) {
    process.exit(1);
  }
}

// Run main function
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
