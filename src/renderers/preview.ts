import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { createServer } from 'vite';
import { imageReferences, isRemoteSource, replaceImageSources, slidePrefix } from '../images/html.js';
import { IMAGE_EXTENSIONS, RemoteImageFetcher, type RemoteImageOptions } from '../images/remote.js';
import { describePresentationError } from '../schemas/input.js';
import { fileRenderOptions, loadPresentation } from '../templates/load.js';
import { renderPresentation, type RenderOptions } from './html.js';
import { injectBeforeBodyEnd, notesScript } from './present.js';

/** Where preview serves the current template's directory. */
const TEMPLATE_PREFIX = '/@slideforge/template/';

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

export interface ServeOptions {
  /** Limits for downloading remote images, which the server fetches and serves itself. */
  remoteImages?: RemoteImageOptions;
}

/** Where the servers serve remote images they downloaded. */
const REMOTE_PREFIX = '/@slideforge/remote/';

/** A fixed banner, outside every slide, listing images that could not be downloaded. */
function imageErrorBanner(errors: string[]): string {
  if (!errors.length) return '';
  return `<div class="sf-image-errors" role="alert" style="position:fixed;top:0;left:0;right:0;z-index:2147483647;max-height:40vh;overflow:auto;padding:12px 20px;background:#7f1d1d;color:#fff;font:14px/1.5 system-ui,sans-serif">
<strong>Some images could not be downloaded</strong><ul style="margin:4px 0 0;padding-left:20px">${errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul></div>`;
}

/** Loopback-only preview that reloads the browser when the JSON or a file beside it changes. */
export async function previewPresentation(input: string, port = DEFAULT_PREVIEW_PORT, options: ServeOptions = {}) {
  return serveDeck(input, port, false, new RemoteImageFetcher(options.remoteImages));
}

/**
 * Loopback-only server for presenting: presentation mode and the notes panel, with no reload client
 * and no file watching, so a save never changes the screen. A manual reload renders the saved JSON.
 * Every remote image is downloaded before the server starts, and any failure stops it.
 */
export async function presentPresentation(input: string, port = DEFAULT_PRESENT_PORT, options: ServeOptions = {}) {
  const fetcher = new RemoteImageFetcher(options.remoteImages);
  const file = resolve(input);
  const loaded = await loadPresentation(file);
  const html = renderPresentation(loaded.content, fileRenderOptions(file, loaded));
  const failures = (await Promise.all(imageReferences(html).filter(({ src }) => isRemoteSource(src)).map(({ src, slide }) =>
    fetcher.fetch(src).then(() => undefined, (error: unknown) =>
      `${slidePrefix(slide)}${error instanceof Error ? error.message : String(error)}`)))).filter(Boolean);
  if (failures.length) throw new Error(`Cannot present; download these images or fix their URLs:\n${[...new Set(failures)].join('\n')}`);
  return serveDeck(input, port, true, fetcher);
}

async function serveDeck(input: string, port: number, present: boolean, fetcher: RemoteImageFetcher) {
  const file = resolve(input);
  /** Remote image URLs by the path the server serves them at. */
  const remote = new Map<string, string>();
  const remotePath = (url: string) => {
    const path = `${REMOTE_PREFIX}${createHash('sha256').update(url).digest('hex').slice(0, 32)}`;
    remote.set(path, url);
    return path;
  };
  /**
   * Download the page's remote images and point them at this server. A failed image keeps its URL
   * and is listed in a banner; this server's own URLs (template assets) are left alone.
   */
  const serveRemoteImages = async (html: string, origin: string) => {
    const errors = new Map<string, string>();
    await Promise.all(imageReferences(html)
      .filter(({ src }) => isRemoteSource(src) && !src.startsWith(origin))
      .map(({ src, slide }) => fetcher.fetch(src).catch((error: unknown) => {
        errors.set(src, `${slidePrefix(slide)}${error instanceof Error ? error.message : String(error)}`);
      })));
    const rewritten = replaceImageSources(html, src =>
      isRemoteSource(src) && !src.startsWith(origin) && !errors.has(src) ? remotePath(src) : undefined);
    return injectBeforeBodyEnd(rewritten, imageErrorBanner([...new Set(errors.values())]));
  };
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

        // Remote images are downloaded once by the server and kept in memory for its lifetime.
        server.middlewares.use(async (request, response, next) => {
          const url = remote.get(request.url?.split('?')[0] ?? '');
          if (url === undefined) return next();
          try {
            const image = await fetcher.fetch(url);
            response.setHeader('Content-Type', image.type);
            response.setHeader('Cache-Control', 'no-store');
            response.end(image.data);
          } catch {
            response.statusCode = 502;
            response.end();
          }
        });

        // The template's directory can be outside the root, so its assets are served under a prefix.
        let templateDirectory: string | undefined;
        server.middlewares.use(async (request, response, next) => {
          const path = request.url?.split('?')[0] ?? '';
          if (!path.startsWith(TEMPLATE_PREFIX)) return next();
          const type = IMAGE_EXTENSIONS.get(extname(path).toLowerCase());
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
            html = await serveRemoteImages(html, `http://${request.headers.host ?? `127.0.0.1:${port}`}/`);
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
