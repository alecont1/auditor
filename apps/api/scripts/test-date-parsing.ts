/**
 * Test script to verify date format parsing works correctly
 */

import { parseDateWithFormat, formatDateWithFormat } from '../src/modules/analysis/analysis.service';

console.log('=== Testing Date Format Parsing ===\n');

// Test US format (MM/DD/YYYY)
console.log('1. US Format (MM/DD/YYYY):');
const usDate1 = parseDateWithFormat('01/15/24', 'MM/DD/YYYY');
console.log(`   "01/15/24" → ${usDate1.toLocaleDateString('en-US')} (should be Jan 15, 2024)`);

const usDate2 = parseDateWithFormat('12/31/2023', 'MM/DD/YYYY');
console.log(`   "12/31/2023" → ${usDate2.toLocaleDateString('en-US')} (should be Dec 31, 2023)`);

// Test International format (DD/MM/YYYY)
console.log('\n2. International Format (DD/MM/YYYY):');
const intlDate1 = parseDateWithFormat('15/01/24', 'DD/MM/YYYY');
console.log(`   "15/01/24" → ${intlDate1.toLocaleDateString('en-US')} (should be Jan 15, 2024)`);

const intlDate2 = parseDateWithFormat('31/12/2023', 'DD/MM/YYYY');
console.log(`   "31/12/2023" → ${intlDate2.toLocaleDateString('en-US')} (should be Dec 31, 2023)`);

// Test that the same date string is interpreted differently
console.log('\n3. Same string, different formats:');
const ambiguousUS = parseDateWithFormat('01/05/24', 'MM/DD/YYYY');
const ambiguousIntl = parseDateWithFormat('01/05/24', 'DD/MM/YYYY');
console.log(`   "01/05/24" with MM/DD/YYYY → ${ambiguousUS.toLocaleDateString('en-US')} (should be Jan 5, 2024)`);
console.log(`   "01/05/24" with DD/MM/YYYY → ${ambiguousIntl.toLocaleDateString('en-US')} (should be May 1, 2024)`);

// Test formatting
console.log('\n4. Date formatting:');
const testDate = new Date(2024, 0, 15); // Jan 15, 2024
console.log(`   Jan 15, 2024 with MM/DD/YYYY → "${formatDateWithFormat(testDate, 'MM/DD/YYYY')}" (should be "01/15/2024")`);
console.log(`   Jan 15, 2024 with DD/MM/YYYY → "${formatDateWithFormat(testDate, 'DD/MM/YYYY')}" (should be "15/01/2024")`);

console.log('\n=== All tests complete ===');
