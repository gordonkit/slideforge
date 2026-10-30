import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { createServer } from 'vite';
import { describePresentationError } from '../schemas/input.js';
import { loadPresentation } from '../templates/load.js';
import { renderPresentation, type RenderOptions } from './html.js';
import { injectBeforeBodyEnd, notesScript } from './present.js';

/** Where preview serves the current template's directory. */
const TEMPLATE_PREFIX = '/@slideforge/template/';
const imageTypes: Partial<Record<string, string>> = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
};

/**
 * Preview-only: scale slides down to fit the window. Automated browsers (navigator.webdriver)
 * are skipped so exporting or validating the preview URL still measures the full canvas.
 */
const fitToWindow = `<style>@media screen { .sf-presentation { zoom: var(--sf-preview-zoom, 1); } }</style>
<script>(() => {
  if (navigator.webdriver) return;
  const fit = () => {
    const style = getComputedStyle(document.body);
    const width = parseFloat(style.getPropertyValue('--slide-width')) + 2 * parseFloat(style.getPropertyValue('--sf-spacing-page'));
    document.body.style.setProperty('--sf-preview-zoom', String(Math.min(1, document.documentElement.clientWidth / width)));
  };
  addEventListener('resize', fit);
  fit();
})();</script>`;

function escapeHtml(value: string): string {
  return value.replace(/[<>&"']/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
  })[char]!);
}

function errorPage(message: string, present: boolean): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Invalid presentation</title></head>
<body style="margin:0;padding:32px;font:16px/1.5 system-ui,sans-serif;background:#fef2f2;color:#7f1d1d">
<h1 style="margin:0 0 16px;font-size:20px">Invalid presentation</h1>
<pre style="margin:0;white-space:pre-wrap;font:14px/1.5 ui-monospace,monospace">${escapeHtml(message)}</pre>
<p>${present ? 'Fix the JSON, save, and reload this page.' : 'Fix the JSON and save; this page reloads automatically.'}</p></body></html>`;
}

/** Chosen to stay clear of Vite's own 5173 default, which other local projects often hold. */
export const DEFAULT_PREVIEW_PORT = 5180;
/** One above the preview port, so a deck can be previewed and presented at the same time. */
export const DEFAULT_PRESENT_PORT = 5181;

/** Loopback-only preview that reloads the browser when the JSON or a file beside it changes. */
export async function previewPresentation(input: string, port = DEFAULT_PREVIEW_PORT) {
  return serveDeck(input, port, false);
}

/**
 * Loopback-only server for presenting: presentation mode and the notes panel, with no reload client
 * and no file watching, so a save never changes the screen. A manual reload renders the saved JSON.
 */
export async function presentPresentation(input: string, port = DEFAULT_PRESENT_PORT) {
  return serveDeck(input, port, true);
}

async function serveDeck(input: string, port: number, present: boolean) {
  const file = resolve(input);
  const server = await createServer({
    configFile: false,
    root: dirname(file),
    server: present
      ? { host: '127.0.0.1', port, strictPort: true, hmr: false, watch: null }
      : { host: '127.0.0.1', port, strictPort: true },
    plugins: [{
      name: 'slideforge-content',
      configureServer(server) {
        if (!present) {
          // Editors often emit several events per save; send one reload per burst.
          let pending: NodeJS.Timeout | undefined;
          const reload = () => {
            clearTimeout(pending);
            pending = setTimeout(() => server.ws.send({ type: 'full-reload' }), 100);
          };
          server.watcher.add(file);
          for (const event of ['add', 'change', 'unlink'] as const) server.watcher.on(event, reload);
        }

        // The template's directory can be outside the root, so its assets are served under a prefix.
        let templateDirectory: string | undefined;
        server.middlewares.use(async (request, response, next) => {
          const path = request.url?.split('?')[0] ?? '';
          if (!path.startsWith(TEMPLATE_PREFIX)) return next();
          const type = imageTypes[extname(path).toLowerCase()];
          let asset: string | undefined;
          try {
            asset = templateDirectory && resolve(templateDirectory, decodeURIComponent(path.slice(TEMPLATE_PREFIX.length)));
          } catch {
            asset = undefined;
          }
          if (!type || !asset || !asset.startsWith(templateDirectory + sep)) {
            response.statusCode = 404;
            return response.end();
          }
          try {
            const data = await readFile(asset);
            response.setHeader('Content-Type', type);
            response.setHeader('Cache-Control', 'no-store');
            response.end(data);
          } catch {
            response.statusCode = 404;
            response.end();
          }
        });

        server.middlewares.use(async (request, response, next) => {
          if (request.url?.split('?')[0] !== '/') return next();
          let html: string;
          templateDirectory = undefined;
          try {
            const loaded = await loadPresentation(file);
            templateDirectory = loaded.template?.directory;
            const options: RenderOptions = { present };
            if (loaded.template) {
              if (!present) server.watcher.add([loaded.template.file, loaded.template.directory]);
              options.template = loaded.template.template;
              options.templateBaseUrl = `http://${request.headers.host ?? `127.0.0.1:${port}`}${TEMPLATE_PREFIX}`;
            }
            html = renderPresentation(loaded.content, options);
            if (!present) html = injectBeforeBodyEnd(html, fitToWindow, notesScript);
          } catch (error) {
            response.statusCode = 400;
            html = errorPage(describePresentationError(error), present);
          }
          // Injects Vite's client, which listens for the reload message.
          if (!present) html = await server.transformIndexHtml('/', html);
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(html);
        });
      },
    }],
  });
  await server.listen();
  return server;
}
