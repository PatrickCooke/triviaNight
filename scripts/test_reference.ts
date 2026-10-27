import { searchReference, expandQuery } from '../server/reference.js';

const tests = ['space', 'presidents', 'mythology', 'baseball', 'chemistry', 'shakespeare'];

for (const term of tests) {
  const expanded = expandQuery(term);
  const r = searchReference(term, 3, 0);
  console.log(`\n[${term}] → ${expanded.length} tokens, ${r.total.toLocaleString()} hits`);
  r.results.forEach(x => console.log(`  "${x.answer}" → ${x.question}`));
}
