import fs from 'node:fs';

function inspectFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');
  const testRegex = /test\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\);/g;
  let m;
  const tests = [];
  while ((m = testRegex.exec(code)) !== null) {
    const title = m[1];
    const body = m[2].trim();
    const isOnlyAssertTrue = /^(?:\/\/[^\n]*\n|\s*)*assert\(true\);?(?:\s*|\/\/[^\n]*)*$/.test(body);
    // Find line number
    const sub = code.substring(0, m.index);
    const lineNum = sub.split('\n').length;
    tests.push({ title, lineNum, isOnlyAssertTrue, body });
  }
  return tests;
}

const t1 = inspectFile('demo_video_player/tests/tier1_feature_coverage.test.mjs');
const t2 = inspectFile('demo_video_player/tests/tier2_boundary_corner.test.mjs');
const t3 = inspectFile('demo_video_player/tests/tier3_cross_feature.test.mjs');

console.log('=== TIER 1 DUMMY TESTS (20) ===');
t1.filter(t => t.isOnlyAssertTrue).forEach((t, i) => {
  console.log(`${i+1}. [L${t.lineNum}] ${t.title}`);
});

console.log('\n=== TIER 3 DUMMY TESTS (3) ===');
t3.filter(t => t.isOnlyAssertTrue).forEach((t, i) => {
  console.log(`${i+1}. [L${t.lineNum}] ${t.title}`);
});

console.log('\n=== TIER 2 DUMMY TESTS (76) ===');
t2.filter(t => t.isOnlyAssertTrue).forEach((t, i) => {
  console.log(`${i+1}. [L${t.lineNum}] ${t.title}`);
});
