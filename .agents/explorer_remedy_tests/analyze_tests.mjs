import fs from 'node:fs';

function analyzeSuite(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const testRegex = /test\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:async\s*)?\(\s*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\);/g;
  let m;
  const tests = [];
  while ((m = testRegex.exec(code)) !== null) {
    const title = m[1];
    const body = m[2].trim();
    const isOnlyAssertTrue = /^(?:\/\/[^\n]*\n|\s*)*assert\(true\);?(?:\s*|\/\/[^\n]*)*$/.test(body);
    const hasAssertTrue = body.includes('assert(true)');
    // Count real assertions (excluding bare assert(true))
    const assertions = (body.match(/assert[A-Za-z]*\s*\([^)]*\)/g) || [])
      .filter(a => !a.replace(/\s+/g, '').includes('assert(true)'));
    tests.push({ title, isOnlyAssertTrue, hasAssertTrue, realAssertionsCount: assertions.length, body });
  }
  return tests;
}

const files = [
  'demo_video_player/tests/tier1_feature_coverage.test.mjs',
  'demo_video_player/tests/tier2_boundary_corner.test.mjs',
  'demo_video_player/tests/tier3_cross_feature.test.mjs'
];

const report = {};
for (const f of files) {
  const tests = analyzeSuite(f);
  const onlyTrue = tests.filter(t => t.isOnlyAssertTrue);
  const masked = tests.filter(t => t.hasAssertTrue && !t.isOnlyAssertTrue);
  const clean = tests.filter(t => !t.hasAssertTrue);
  report[f] = {
    total: tests.length,
    onlyTrueCount: onlyTrue.length,
    maskedCount: masked.length,
    cleanCount: clean.length,
    onlyTrue: onlyTrue.map(t => t.title),
    masked: masked.map(t => ({ title: t.title, realAssertions: t.realAssertionsCount, body: t.body }))
  };
}

fs.writeFileSync('.agents/explorer_remedy_tests/tests_analysis.json', JSON.stringify(report, null, 2));
console.log('Analysis written to .agents/explorer_remedy_tests/tests_analysis.json');
for (const [f, d] of Object.entries(report)) {
  console.log(`${f}: Total=${d.total}, OnlyAssertTrue=${d.onlyTrueCount}, Masked/Guarded=${d.maskedCount}, Clean=${d.cleanCount}`);
}
