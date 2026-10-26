#!/usr/bin/env node
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { renderPresentation } from '../renderers/html.js';
import { describePresentationError } from '../schemas/input.js';
import { DEFAULT_PREVIEW_PORT, previewPresentation } from '../renderers/preview.js';
import { exportPresentation } from '../exporters/pptx.js';
import { fileRenderOptions, loadPresentation, loadTemplate } from '../templates/load.js';
import { validatePptx } from '../validators/pptx.js';

const help = `SlideForge — editable presentations from structured content

Usage:
  slideforge init [presentation.json] [--template <name|./path>]
  slideforge build presentation.json [--output presentation.html]
  slideforge preview presentation.json [--port ${DEFAULT_PREVIEW_PORT}]
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
        template: { type: 'string' },
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
  if (values.template !== undefined && command !== 'init') {
    throw new UsageError('--template applies only to init; set "template" in the JSON instead');
  }
  if (command === 'init') {
    const example = await readFile(new URL('../../examples/basic/presentation.json', import.meta.url), 'utf8');
    const destination = resolve(input ?? 'presentation.json');
    const assetDirectory = `${basename(destination, '.json')}-assets`;
    let content = example.replaceAll('assets/diagram.svg', `${encodeURIComponent(assetDirectory)}/diagram.svg`);
    if (values.template !== undefined) {
      const reference = String(values.template);
      // Fails before anything is written if the template is unknown or invalid.
      await loadTemplate(reference, dirname(destination));
      content = content.replace('\n  "theme":', `\n  "template": ${JSON.stringify(reference)},\n  "theme":`);
    }
    // Creates missing parent folders, like the asset folder below.
    await mkdir(dirname(destination), { recursive: true });
    try {
      await writeFile(destination, content, { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new Error(`${destination} already exists; init never overwrites a file`);
      }
      throw error;
    }
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
      const loaded = await loadPresentation(file);
      const html = renderPresentation(loaded.content, fileRenderOptions(file, loaded));
      const output = resolve(String(values.output ?? `${basename(input, '.json')}.html`));
      await writeFile(output, html);
      console.log(`Built ${output}`);
      break;
    }
    case 'preview': {
      const port = Number(values.port ?? DEFAULT_PREVIEW_PORT);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new UsageError('Port must be 1–65535');
      // Validate the presentation and its template before starting a persistent server.
      const file = resolve(input);
      const loaded = await loadPresentation(file);
      renderPresentation(loaded.content, fileRenderOptions(file, loaded));
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
  console.error(`slideforge: ${describePresentationError(error)}`);
  process.exitCode = error instanceof UsageError ? 2 : 1;
});
