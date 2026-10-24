import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';
import { renderPresentation } from './html.js';

/** Loopback-only preview; reload the browser after editing JSON. */
export async function previewPresentation(input: string, port = 5173) {
  const file = resolve(input);
  const server = await createServer({
    configFile: false,
    root: dirname(file),
    server: { host: '127.0.0.1', port, strictPort: true },
    plugins: [{
      name: 'slideforge-content',
      configureServer(server) {
        server.middlewares.use(async (request, response, next) => {
          if (request.url?.split('?')[0] !== '/') return next();
          try {
            const html = renderPresentation(JSON.parse(await readFile(file, 'utf8')));
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.setHeader('Cache-Control', 'no-store');
            response.end(html);
          } catch (error) {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'text/plain; charset=utf-8');
            response.end(error instanceof Error ? error.message : 'Invalid presentation');
          }
        });
      },
    }],
  });
  await server.listen();
  return server;
}
