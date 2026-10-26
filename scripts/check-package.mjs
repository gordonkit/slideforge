#!/usr/bin/env node
// Packs SlideForge as npm would publish it, installs the tarball into a new project, and uses it
// the way a user would. Run with `npm run test:package`; Playwright's Chromium must be installed.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const npmCli = process.env.npm_execpath;
if (!npmCli?.endsWith('.js')) throw new Error('Run this through npm: npm run test:package');

function run(command, args, cwd) {
  const result = spawnSync(process.execPath, [command, ...args], { cwd, encoding: 'utf8', timeout: 600_000 });
  if (result.status !== 0) {
    throw new Error(`${[command, ...args].join(' ')} exited ${result.status}\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

function check(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`ok - ${message}`);
}

const work = mkdtempSync(join(tmpdir(), 'slideforge-package-'));
try {
  // Build first, then pack without prepack, whose build output would mix with pack's JSON.
  run(npmCli, ['run', 'build'], root);
  const [packed] = JSON.parse(run(npmCli, ['pack', '--json', '--ignore-scripts', '--pack-destination', work], root));
  const files = new Set(packed.files.map(file => file.path));
  for (const file of ['dist/cli/index.js', 'dist/index.js', 'dist/exporters/engine.js', 'dist/themes/slides.css',
    'dist/layouts/cover/cover.css', 'templates/corporate/template.json', 'templates/corporate/assets/rule.svg',
    'examples/basic/presentation.json', 'examples/templates/brand/template.json', 'LICENSE', 'NOTICE',
    'THIRD_PARTY_NOTICES.md', 'README.md']) {
    check(files.has(file), `the package contains ${file}`);
  }
  for (const prefix of ['src/', 'tests/', 'site/', 'docker/', 'dist/exporters/browser.']) {
    check(![...files].some(file => file.startsWith(prefix)), `the package leaves out ${prefix}`);
  }

  // A user's project that installs the tarball as published.
  writeFileSync(join(work, 'package.json'), JSON.stringify({ name: 'slideforge-package-check', private: true, type: 'module' }));
  run(npmCli, ['install', '--no-audit', '--no-fund', join(work, packed.filename)], work);
  const installed = join(work, 'node_modules');
  check(existsSync(join(installed, 'slideforge', 'dist', 'cli', 'index.js')), 'slideforge is installed');
  check(existsSync(join(installed, '.bin', process.platform === 'win32' ? 'slideforge.cmd' : 'slideforge')), 'the slideforge bin is linked');
  // Users run `npx playwright install chromium`; it must use the pinned Playwright, not the latest.
  const playwright = JSON.parse(readFileSync(join(installed, 'playwright', 'package.json'), 'utf8')).version;
  const pinned = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies.playwright;
  check(playwright === pinned, `Playwright ${pinned} is installed`);
  check(existsSync(join(installed, '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright')),
    'the playwright bin is linked, so npx uses the installed version');
  for (const name of ['puppeteer', 'dom-to-pptx', 'pptxgenjs']) {
    check(!existsSync(join(installed, name)), `${name} is not installed (it is bundled or unused)`);
  }

  const cli = join(installed, 'slideforge', 'dist', 'cli', 'index.js');
  check(run(cli, ['--help'], work).includes('slideforge init'), 'the CLI prints help');
  writeFileSync(join(work, 'api.mjs'), "import { layoutFamilies, builtInTemplates } from 'slideforge';\n"
    + "console.log(JSON.stringify({ layoutFamilies, templates: await builtInTemplates() }));\n");
  const api = JSON.parse(run(join(work, 'api.mjs'), [], work));
  check(api.layoutFamilies.includes('quote') && api.templates.includes('corporate'), 'the package root can be imported');

  const decks = [
    ['init with a built-in template', join(work, 'decks', 'corporate', 'deck.json'), () => {
      run(cli, ['init', join(work, 'decks', 'corporate', 'deck.json'), '--template', 'corporate'], work);
    }],
    ['the shipped examples/templates', join(installed, 'slideforge', 'examples', 'templates', 'presentation.json'), () => {}],
  ];
  for (const [label, deck, create] of decks) {
    create();
    const output = join(work, `${label.replace(/\W+/g, '-')}.pptx`);
    run(cli, ['export', deck, '--output', output], work);
    const report = JSON.parse(run(cli, ['validate', output], work));
    const expected = JSON.parse(readFileSync(deck, 'utf8')).slides.length;
    check(report.valid && report.slideCount === expected, `${label} exports ${expected} valid slides`);
  }
  console.log(`\n${packed.filename}: ${packed.files.length} files, ${(packed.size / 1024).toFixed(0)} kB packed`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
