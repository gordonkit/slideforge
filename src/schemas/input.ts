import { readFile } from 'node:fs/promises';
import { z } from 'zod';

/** Read a presentation JSON file; malformed JSON names the file in its error. */
export async function readPresentationFile(file: string): Promise<unknown> {
  const text = await readFile(file, 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new SyntaxError(`Invalid JSON in ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((result, key) => typeof key === 'number'
    ? `${result}[${key}]`
    : `${result}${result ? '.' : ''}${String(key)}`, '');
}

/**
 * Describe a failure for people: schema problems become one line each with their path and,
 * for slides, the one-based slide number that people count by. Other errors keep their message.
 */
export function describePresentationError(error: unknown): string {
  if (!(error instanceof z.ZodError)) return error instanceof Error ? error.message : String(error);
  const lines = error.issues.map(issue => {
    const [first, index] = issue.path;
    const slide = first === 'slides' && typeof index === 'number' ? ` (slide ${index + 1})` : '';
    const path = formatPath(issue.path) || 'presentation';
    return `  - ${path}${slide}: ${issue.message}`;
  });
  const count = lines.length === 1 ? '1 problem' : `${lines.length} problems`;
  return `The presentation does not match the schema (${count}):\n${lines.join('\n')}`;
}
