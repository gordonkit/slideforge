#!/usr/bin/env node
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { renderPresentation } from '../renderers/html.js';
import { previewPresentation } from '../renderers/preview.js';
import { exportPresentation } from '../exporters/pptx.js';
import { validatePptx } from '../validators/pptx.js';

const help = `SlideForge — editable presentations from structured content

Usage:
  slideforge init [presentation.json]
  slideforge build presentation.json [--output presentation.html]
  slideforge preview presentation.json [--port 5173]
  slideforge export <presentation.json|slides.html|https://url> --output presentation.pptx
  slideforge validate presentation.pptx

Export options: --selector <css> (default: [data-pptx="slide"], .slide)
Use only trusted HTML/URLs: export runs their scripts in a local browser.
Exit codes: 0 success, 1 operation/validation failure, 2 invalid CLI usage.`;

class UsageError extends Error {}

async function main(): Promise<void> {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        output: { type: 'string', short: 'o' },
        selector: { type: 'string' },
        port: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : 'Invalid arguments');
  }
  const { values, positionals } = parsed;
  if (values.help || positionals.length === 0) {
    console.log(help);
    return;
  }
  const [command, input] = positionals;
  if (positionals.length > 2) throw new UsageError('Too many positional arguments');
  if (!['init', 'build', 'preview', 'export', 'validate'].includes(command!)) {
    throw new UsageError(`Unknown command: ${command}`);
  }
  if (command === 'init') {
    const example = await readFile(new URL('../../examples/basic/presentation.json', import.meta.url), 'utf8');
    const destination = resolve(input ?? 'presentation.json');
    const assetDirectory = `${basename(destination, '.json')}-assets`;
    const content = example.replaceAll('assets/diagram.svg', `${encodeURIComponent(assetDirectory)}/diagram.svg`);
    await writeFile(destination, content, { flag: 'wx' });
    try {
      await mkdir(resolve(dirname(destination), assetDirectory), { recursive: true });
      await copyFile(
        new URL('../../examples/basic/assets/diagram.svg', import.meta.url),
        resolve(dirname(destination), assetDirectory, 'diagram.svg'),
        constants.COPYFILE_EXCL,
      );
    } catch (error) {
      await unlink(destination);
      throw error;
    }
    console.log(`Created ${destination}`);
    return;
  }
  if (!input) throw new UsageError(`${command} requires an input file or URL`);
  switch (command) {
    case 'build': {
      const file = resolve(input);
      const html = renderPresentation(JSON.parse(await readFile(file, 'utf8')), {
        baseUrl: pathToFileURL(dirname(file) + '/').href,
      });
      const output = resolve(String(values.output ?? `${basename(input, '.json')}.html`));
      await writeFile(output, html);
      console.log(`Built ${output}`);
      break;
    }
    case 'preview': {
      const port = Number(values.port ?? 5173);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new UsageError('Port must be 1–65535');
      // Validate before starting a persistent server.
      renderPresentation(JSON.parse(await readFile(resolve(input), 'utf8')));
      const server = await previewPresentation(input, port);
      server.printUrls();
      break;
    }
    case 'export': {
      if (!values.output) throw new UsageError('export requires --output presentation.pptx');
      const issues = await exportPresentation(input, {
        output: String(values.output),
        selector: values.selector ? String(values.selector) : undefined,
      });
      for (const issue of issues) console.warn(`${issue.severity}: ${issue.message}`);
      console.log(`Exported ${resolve(String(values.output))}`);
      break;
    }
    case 'validate': {
      const report = validatePptx(await readFile(resolve(input)));
      console.log(JSON.stringify(report, null, 2));
      if (!report.valid) process.exitCode = 1;
      break;
    }
  }
}

main().catch((error: unknown) => {
  console.error(`slideforge: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
});
