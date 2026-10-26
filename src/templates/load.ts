import { readdir, stat } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { quotedList } from '../layouts/registry.js';
import type { RenderOptions } from '../renderers/html.js';
import { describeSchemaError, readPresentationFile } from '../schemas/input.js';
import { parsePresentation } from '../schemas/presentation.js';
import { parseTemplate, type Template } from './schema.js';

/** Built-in templates ship as `templates/<name>/template.json` in the package. */
export const BUILT_IN_TEMPLATE_DIRECTORY = fileURLToPath(new URL('../../templates/', import.meta.url));

export interface LoadedTemplate {
  template: Template;
  /** The template JSON file. */
  file: string;
  /** The directory its relative asset paths resolve against. */
  directory: string;
}

export interface LoadedPresentation {
  /** The presentation JSON as read; `renderPresentation` validates it again. */
  content: unknown;
  template?: LoadedTemplate;
}

async function isFile(path: string): Promise<boolean> {
  return (await stat(path).catch(() => undefined))?.isFile() ?? false;
}

/** Names of the built-in templates, sorted. */
export async function builtInTemplates(): Promise<string[]> {
  const entries = await readdir(BUILT_IN_TEMPLATE_DIRECTORY, { withFileTypes: true }).catch(() => []);
  const names: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && await isFile(resolve(BUILT_IN_TEMPLATE_DIRECTORY, entry.name, 'template.json'))) {
      names.push(entry.name);
    }
  }
  return names.sort();
}

/**
 * Load a template by reference: a built-in name, or a `./`/`../` path relative to `from`
 * naming a `.json` file or a directory that holds `template.json`.
 */
export async function loadTemplate(reference: string, from: string): Promise<LoadedTemplate> {
  let file: string;
  if (/^\.\.?\//.test(reference)) {
    const path = resolve(from, reference);
    file = extname(path).toLowerCase() === '.json' ? path : resolve(path, 'template.json');
    if (!await isFile(file)) throw new Error(`Template "${reference}" not found: ${file} does not exist`);
  } else {
    file = resolve(BUILT_IN_TEMPLATE_DIRECTORY, reference, 'template.json');
    if (!await isFile(file)) {
      const names = await builtInTemplates();
      throw new Error(`Unknown template "${reference}". Use ${names.length ? quotedList(names) : 'a path'}, or a path starting with "./" or "../"`);
    }
  }
  const input = await readPresentationFile(file);
  try {
    return { template: parseTemplate(input), file, directory: dirname(file) };
  } catch (error) {
    if (error instanceof z.ZodError) throw new Error(describeSchemaError(error, `The template ${file}`, 'template'));
    throw error;
  }
}

/**
 * Render options for a presentation read from `file`: its assets resolve against the file's
 * directory and the template's against the template's directory, both as file URLs.
 */
export function fileRenderOptions(file: string, loaded: LoadedPresentation): RenderOptions {
  const options: RenderOptions = { baseUrl: pathToFileURL(dirname(resolve(file)) + '/').href };
  if (loaded.template) {
    options.template = loaded.template.template;
    options.templateBaseUrl = pathToFileURL(loaded.template.directory + '/').href;
  }
  return options;
}

/** Read a presentation JSON file and the template it names, if any. */
export async function loadPresentation(file: string): Promise<LoadedPresentation> {
  const path = resolve(file);
  const content = await readPresentationFile(path);
  const { template } = parsePresentation(content);
  return template === undefined ? { content } : { content, template: await loadTemplate(template, dirname(path)) };
}
