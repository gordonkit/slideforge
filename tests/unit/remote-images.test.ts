import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { embedImages, imageReferences, replaceImageSources } from '../../src/images/html.js';
import { isPrivateAddress, RemoteImageFetcher, sharePageHint, sniffImageType } from '../../src/images/remote.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const svg = '<?xml version="1.0"?><!-- logo --><svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"/>';

let server: Server;
let origin: string;
const requests: Array<{ url: string; headers: IncomingHttpHeaders }> = [];
beforeAll(async () => {
  server = createServer((request, response) => {
    requests.push({ url: request.url!, headers: request.headers });
    const url = request.url!;
    const redirect = /^\/redirect\/(\d+)$/.exec(url);
    if (redirect) {
      const left = Number(redirect[1]);
      response.writeHead(302, { location: left > 1 ? `/redirect/${left - 1}` : '/png' }).end();
    } else if (url === '/png') response.writeHead(200, { 'content-type': 'image/png' }).end(png);
    else if (url === '/corp') response.writeHead(200, { 'content-type': 'image/png', 'cross-origin-resource-policy': 'same-site' }).end(png);
    else if (url === '/octet') response.writeHead(200, { 'content-type': 'application/octet-stream' }).end(png);
    else if (url === '/svg') response.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8' }).end(svg);
    else if (url === '/page') response.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><title>Share</title>');
    else if (url === '/untyped-page') response.writeHead(200).end('<html><body>Share</body></html>');
    else if (url === '/mismatch') response.writeHead(200, { 'content-type': 'image/jpeg' }).end(png);
    else if (url === '/text') response.writeHead(200, { 'content-type': 'text/plain' }).end('hello');
    else if (url === '/big') response.writeHead(200, { 'content-type': 'image/png' }).end(Buffer.concat([png, Buffer.alloc(4096)]));
    else if (url === '/slow') setTimeout(() => response.writeHead(200, { 'content-type': 'image/png' }).end(png), 2000);
    else response.writeHead(404).end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server port');
  origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});

describe('RemoteImageFetcher', () => {
  it('downloads images regardless of CORS and CORP headers, without credentials', async () => {
    const fetcher = new RemoteImageFetcher();
    for (const path of ['/png', '/corp', '/octet']) {
      const image = await fetcher.fetch(`${origin}${path}`);
      expect([path, image.type, image.data.equals(png)]).toEqual([path, 'image/png', true]);
    }
    expect((await fetcher.fetch(`${origin}/svg`)).type).toBe('image/svg+xml');
    const sent = requests.find(request => request.url === '/png')!.headers;
    expect(sent.cookie).toBeUndefined();
    expect(sent.authorization).toBeUndefined();
  });

  it('fetches each URL once', async () => {
    const fetcher = new RemoteImageFetcher();
    const before = requests.filter(request => request.url === '/png').length;
    await Promise.all([fetcher.fetch(`${origin}/png`), fetcher.fetch(`${origin}/png`)]);
    await fetcher.fetch(`${origin}/png`);
    expect(requests.filter(request => request.url === '/png').length).toBe(before + 1);
  });

  it('names the cause of each failure', async () => {
    const fetcher = new RemoteImageFetcher({ maxBytes: 1024, timeout: 300 });
    for (const [path, message] of [
      ['/page', 'Remote image is a web page, not an image'],
      ['/untyped-page', 'Remote image is a web page, not an image'],
      ['/mismatch', 'Remote image says it is image/jpeg but contains image/png'],
      ['/text', 'Remote image is not SVG, PNG, JPEG, GIF, WebP, or AVIF (Content-Type: text/plain)'],
      ['/missing', 'Remote image returned HTTP 404'],
      ['/big', 'Remote image is larger than 1 KiB'],
      ['/slow', 'Remote image timed out after 300 ms'],
      ['/redirect/6', 'Remote image redirected more than 5 times'],
    ] as const) {
      await expect(fetcher.fetch(`${origin}${path}`), path).rejects.toThrow(`${message}: ${origin}${path}`);
    }
    expect((await fetcher.fetch(`${origin}/redirect/5`)).type).toBe('image/png');
  });

  it('enforces the total size across images', async () => {
    const fetcher = new RemoteImageFetcher({ maxTotalBytes: png.length + 10 });
    await fetcher.fetch(`${origin}/png`);
    await expect(fetcher.fetch(`${origin}/corp`)).rejects.toThrow('Remote images exceed 1 KiB in total');
  });

  it('blocks non-public addresses, by literal, by name, and through redirects', async () => {
    const fetcher = new RemoteImageFetcher({ blockPrivateNetwork: true });
    const port = new URL(origin).port;
    await expect(fetcher.fetch(`${origin}/png`)).rejects.toThrow('Remote image blocked: 127.0.0.1 is not a public address');
    await expect(fetcher.fetch(`http://localhost:${port}/png`)).rejects.toThrow('Remote image blocked: localhost resolves to the non-public address');
    await expect(fetcher.fetch(`http://[::1]:${port}/png`)).rejects.toThrow('is not a public address');
  });

  it('classifies addresses', () => {
    for (const address of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
      expect([address, isPrivateAddress(address)]).toEqual([address, true]);
    }
    for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700::1111', '::ffff:8.8.8.8', 'example.com']) {
      expect([address, isPrivateAddress(address)]).toEqual([address, false]);
    }
  });

  it('ends a web page error with the URL when the host has no share page hint', async () => {
    await expect(new RemoteImageFetcher().fetch(`${origin}/page`)).rejects.toThrow(/web page, not an image: http:\/\/127\.0\.0\.1:\d+\/page$/);
  });

  it('sniffs supported formats and suggests direct links for share pages', () => {
    expect(sniffImageType(png)).toBe('image/png');
    expect(sniffImageType(Buffer.from(svg))).toBe('image/svg+xml');
    expect(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImageType(Buffer.from('<!doctype html><svg></svg>'))).toBeUndefined();
    expect(sharePageHint('https://drive.google.com/file/d/1ejwl1pVpwBDatGxjyMkG06ZXbJ_X-SCj/view?usp=sharing'))
      .toContain('https://lh3.googleusercontent.com/d/1ejwl1pVpwBDatGxjyMkG06ZXbJ_X-SCj');
    expect(sharePageHint('https://1drv.ms/i/s!abc')).toContain('OneDrive');
    expect(sharePageHint('https://contoso.sharepoint.com/:i:/g/abc')).toContain('SharePoint');
    expect(sharePageHint('https://www.dropbox.com/s/abc/a.png?dl=0')).toContain('raw=1');
    expect(sharePageHint('https://example.com/a.png')).toBeUndefined();
  });
});

describe('image sources in rendered HTML', () => {
  const html = '<main><section data-pptx="slide"><img src="a.png" alt=""/></section>'
    + '<section data-pptx="slide"><img alt="x" src="https://example.com/b.png?x=1&amp;y=2"/><iframe src="https://example.com/c"></iframe></section></main>';

  it('lists images with their slide and unescaped source', () => {
    expect(imageReferences(html)).toEqual([
      { src: 'a.png', slide: 1 },
      { src: 'https://example.com/b.png?x=1&y=2', slide: 2 },
    ]);
    expect(imageReferences('<img src="outside.png">')).toEqual([{ src: 'outside.png', slide: undefined }]);
  });

  it('replaces sources and escapes the result', () => {
    const replaced = replaceImageSources(html, src => src.startsWith('https:') ? `/proxy?u=${src}` : undefined);
    expect(replaced).toContain('<img src="a.png" alt=""/>');
    expect(replaced).toContain('src="/proxy?u=https://example.com/b.png?x=1&amp;y=2"');
    expect(replaced).toContain('<iframe src="https://example.com/c">');
  });

  it('embeds local and remote images as data URLs and names the slide on failure', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'slideforge-embed-'));
    try {
      await writeFile(join(directory, 'a.svg'), svg);
      const base = pathToFileURL(directory + '/').href;
      const page = `<section data-pptx="slide"><img src="a.svg"/><img src="${origin}/png"/><img src="data:image/png;base64,AA=="/></section>`;
      const embedded = await embedImages(page, new RemoteImageFetcher(), base);
      expect(imageReferences(embedded).map(({ src }) => src.slice(0, 22))).toEqual([
        'data:image/svg+xml;bas', 'data:image/png;base64,', 'data:image/png;base64,',
      ]);
      await expect(embedImages(`<section data-pptx="slide"></section><section data-pptx="slide"><img src="${origin}/page"/></section>`,
        new RemoteImageFetcher(), base)).rejects.toThrow(`Slide 2: Remote image is a web page, not an image: ${origin}/page`);
      await expect(embedImages('<section data-pptx="slide"><img src="missing.png"/></section>', new RemoteImageFetcher(), base))
        .rejects.toThrow(`Slide 1: Image not found: ${join(directory, 'missing.png')}`);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
