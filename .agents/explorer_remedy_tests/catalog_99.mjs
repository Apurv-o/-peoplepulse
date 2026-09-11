import fs from 'node:fs';

function getTests(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const testRegex = /test\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\);/g;
  let m;
  const tests = [];
  while ((m = testRegex.exec(code)) !== null) {
    const title = m[1];
    const body = m[2].trim();
    const isOnlyAssertTrue = /^(?:\/\/[^\n]*\n|\s*)*assert\(true\);?(?:\s*|\/\/[^\n]*)*$/.test(body);
    const hasAssertTrue = body.includes('assert(true)');
    tests.push({
      title,
      isOnlyAssertTrue,
      hasAssertTrue,
      body,
      index: m.index
    });
  }
  return tests;
}

const t1 = getTests('demo_video_player/tests/tier1_feature_coverage.test.mjs');
const t2 = getTests('demo_video_player/tests/tier2_boundary_corner.test.mjs');
const t3 = getTests('demo_video_player/tests/tier3_cross_feature.test.mjs');

console.log('Tier 1 dummy tests (', t1.filter(t => t.isOnlyAssertTrue).length, '):');
t1.filter(t => t.isOnlyAssertTrue).forEach(t => console.log(' - ' + t.title));

console.log('\nTier 3 dummy tests (', t3.filter(t => t.isOnlyAssertTrue).length, '):');
t3.filter(t => t.isOnlyAssertTrue).forEach(t => console.log(' - ' + t.title));

console.log('\nTier 2 dummy tests (', t2.filter(t => t.isOnlyAssertTrue).length, '):');
t2.filter(t => t.isOnlyAssertTrue).forEach(t => console.log(' - ' + t.title));
