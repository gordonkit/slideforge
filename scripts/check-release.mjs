#!/usr/bin/env node
// Checks that a release tag matches the package before publishing: npm run check:release -- --tag v0.1.0
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { tag: { type: 'string' } } });
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const { version, license } = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const problems = [];

if (!values.tag) problems.push('Pass the release tag: --tag v<version>');
else if (values.tag !== `v${version}`) problems.push(`Tag ${values.tag} does not match package.json version ${version}`);
if (lock.version !== version || lock.packages?.['']?.version !== version) {
  problems.push(`package-lock.json version ${lock.version} does not match package.json version ${version}`);
}
const heading = read('CHANGELOG.md').split('\n').find(line => line.startsWith(`## [${version}]`));
if (!heading) problems.push(`CHANGELOG.md has no "## [${version}] - YYYY-MM-DD" section`);
else if (!/^## \[[^\]]+\] - \d{4}-\d{2}-\d{2}$/.test(heading.trim())) problems.push(`CHANGELOG.md heading "${heading}" needs a release date`);
if (license !== 'Apache-2.0' || !read('LICENSE').includes('Apache License') || !read('NOTICE').trim()) {
  problems.push('LICENSE, NOTICE, and package.json license must agree on Apache-2.0');
}

if (problems.length) {
  console.error(`Release check failed:\n${problems.map(problem => `  - ${problem}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Release check passed for v${version}`);
}
