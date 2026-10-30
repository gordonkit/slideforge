import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { strFromU8, unzipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportPresentation, presentPresentation, previewPresentation, validatePptx } from '../../dist/index.js';

const exec = promisify(execFile);
const cli = resolve('dist/cli/index.js');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#0f766e"/></svg>';

/** An image host that sends no CORS headers, and CORP same-site on /corp.png, like Google Drive. */
async function imageHost(): Promise<{ server: Server; origin: string; hits: Map<string, number> }> {
  const hits = new Map<string, number>();
  const server = createServer((request, response) => {
    hits.set(request.url!, (hits.get(request.url!) ?? 0) + 1);
    if (request.url === '/corp.png') response.writeHead(200, { 'content-type': 'image/png', 'cross-origin-resource-policy': 'same-site' }).end(png);
    else if (request.url === '/diagram.svg') response.writeHead(200, { 'content-type': 'image/svg+xml' }).end(svg);
    else if (request.url === '/share') response.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>Share</title>');
    else if (request.url === '/style.css') response.writeHead(200, { 'content-type': 'text/css' }).end('body{}');
    else response.writeHead(404).end();
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No image host port');
  return { server, origin: `http://127.0.0.1:${address.port}`, hits };
}

async function close(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}

let directory: string;
let host: Awaited<ReturnType<typeof imageHost>>;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'slideforge-remote-'));
  host = await imageHost();
}, 60_000);
afterAll(async () => {
  await close(host.server);
  await rm(directory, { recursive: true, force: true });
}, 60_000);

async function deck(name: string, slides: object[]): Promise<string> {
  const path = join(directory, `${name}.json`);
  await writeFile(path, JSON.stringify({ metadata: { title: name }, slides }));
  return path;
}

const remoteSlides = () => [
  { layout: 'cover', title: 'Remote background', background: `${host.origin}/corp.png` },
  { layout: 'content', title: 'Remote image', blocks: [{ type: 'image', src: `${host.origin}/diagram.svg`, alt: 'Diagram' }] },
];

describe('export', () => {
  it('exports remote images whose host sends no CORS headers or CORP same-site', async () => {
    const output = join(directory, 'remote.pptx');
    await exportPresentation(await deck('remote', remoteSlides()), { output });
    const data = await readFile(output);
    expect(validatePptx(data).valid).toBe(true);
    const files = unzipSync(data);
    expect(strFromU8(files['ppt/slides/slide1.xml']!)).toContain('r:embed="rIdSlideForgeBackground"');
    expect(strFromU8(files['ppt/slides/slide2.xml']!)).toContain('<p:pic>');
  }, 180_000);

  it('names the slide and the cause when a remote image is a web page', async () => {
    const input = await deck('share', [
      { layout: 'cover', title: 'Fine' },
      { layout: 'cover', title: 'Share page', background: `${host.origin}/share` },
    ]);
    await expect(exportPresentation(input, { output: join(directory, 'share.pptx') }))
      .rejects.toThrow(`Slide 2: Remote image is a web page, not an image: ${host.origin}/share`);
  }, 120_000);

  it('blocks non-public addresses for downloads and for browser requests', async () => {
    const input = await deck('blocked', remoteSlides());
    await expect(exportPresentation(input, { output: join(directory, 'blocked.pptx'), remoteImages: { blockPrivateNetwork: true } }))
      .rejects.toThrow('Slide 1: Remote image blocked: 127.0.0.1 is not a public address');

    const html = join(directory, 'stylesheet.html');
    await writeFile(html, `<html><head><link rel="stylesheet" href="${host.origin}/style.css"></head>
      <body style="margin:0;font-family:Arial"><section data-pptx="slide" style="width:1920px;height:1080px"><h1>Styled</h1></section></body></html>`);
    await expect(exportPresentation(html, { output: join(directory, 'stylesheet.pptx'), remoteImages: { blockPrivateNetwork: true } }))
      .rejects.toThrow(`Blocked requests to non-public addresses: ${host.origin}/style.css`);
    expect(host.hits.get('/style.css')).toBeUndefined();
  }, 180_000);
});

describe('preview and present', () => {
  it('serves remote images from the preview, reports failures, and does not refetch on reload', async () => {
    const input = await deck('preview-remote', [...remoteSlides(),
      { layout: 'cover', title: 'Broken', background: `${host.origin}/share` }]);
    const server = await previewPresentation(input, 0);
    try {
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string') throw new Error('Preview did not bind a TCP port');
      const url = `http://127.0.0.1:${address.port}/`;
      const before = host.hits.get('/diagram.svg') ?? 0;
      const page = await (await fetch(url)).text();
      await fetch(url);
      expect(host.hits.get('/diagram.svg')).toBe(before + 1);
      const proxied = [...page.matchAll(/src="(\/@slideforge\/remote\/[0-9a-f]+)"/g)].map(match => match[1]!);
      expect(proxied).toHaveLength(2);
      const image = await fetch(`http://127.0.0.1:${address.port}${proxied[1]}`);
      expect(image.headers.get('content-type')).toBe('image/svg+xml');
      expect(page).toContain('class="sf-image-errors"');
      expect(page).toContain(`Slide 3: Remote image is a web page, not an image: ${host.origin}/share`);
      expect((await fetch(`http://127.0.0.1:${address.port}/@slideforge/remote/unknown`)).status).toBe(404);
    } finally {
      await server.close();
    }
  }, 60_000);

  it('downloads every remote image before presenting and needs no network afterwards', async () => {
    const own = await imageHost();
    const input = await deck('present-remote', [
      { layout: 'cover', title: 'Remote background', background: `${own.origin}/corp.png` },
    ]);
    const server = await presentPresentation(input, 0);
    try {
      await close(own.server);
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string') throw new Error('Present did not bind a TCP port');
      const page = await (await fetch(`http://127.0.0.1:${address.port}/`)).text();
      const path = /src="(\/@slideforge\/remote\/[0-9a-f]+)"/.exec(page)![1];
      const image = await fetch(`http://127.0.0.1:${address.port}${path}`);
      expect(image.status).toBe(200);
      expect(Buffer.from(await image.arrayBuffer()).equals(png)).toBe(true);
      expect(page).not.toContain('sf-image-errors');
    } finally {
      await server.close();
    }

    const broken = await deck('present-broken', [{ layout: 'cover', title: 'Broken', background: `${host.origin}/share` }]);
    await expect(presentPresentation(broken, 0))
      .rejects.toThrow(`Cannot present; download these images or fix their URLs:\nSlide 1: Remote image is a web page`);
    const result = exec(process.execPath, [cli, 'present', broken, '--port', '5199']);
    await expect(result).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('Cannot present') });
  }, 60_000);
});

describe('build --embed-assets', () => {
  it('inlines local and remote images and leaves the default build unchanged', async () => {
    await writeFile(join(directory, 'local.svg'), svg);
    const input = await deck('embed', [...remoteSlides(),
      { layout: 'content', title: 'Local', blocks: [{ type: 'image', src: 'local.svg', alt: 'Local' }] }]);
    const plain = join(directory, 'embed-plain.html');
    const embedded = join(directory, 'embed.html');
    await exec(process.execPath, [cli, 'build', input, '--output', plain]);
    await exec(process.execPath, [cli, 'build', input, '--present', '--embed-assets', '--output', embedded]);
    const plainHtml = await readFile(plain, 'utf8');
    expect(plainHtml).toContain(`src="${host.origin}/corp.png"`);
    expect(plainHtml).toContain('src="local.svg"');
    const html = await readFile(embedded, 'utf8');
    const sources = [...html.matchAll(/<img\b[^>]*\ssrc="([^"]*)"/g)].map(match => match[1]!.slice(0, 19));
    expect(sources).toEqual(['data:image/png;base', 'data:image/svg+xml;', 'data:image/svg+xml;']);
    expect(html).toContain('sf-presenting');

    await expect(exec(process.execPath, [cli, 'build', input, '--embed-assets', '--block-private-network', '--output', join(directory, 'x.html')]))
      .rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('Slide 1: Remote image blocked') });
    await expect(exec(process.execPath, [cli, 'export', input, '--embed-assets', '--output', 'x.pptx'])).rejects.toMatchObject({ code: 2 });
  }, 120_000);
});
