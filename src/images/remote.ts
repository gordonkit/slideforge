import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP, type LookupFunction } from 'node:net';

/** Image formats SlideForge supports, keyed by MIME type. */
export const IMAGE_TYPES: ReadonlyMap<string, string> = new Map([
  ['image/svg+xml', '.svg'], ['image/png', '.png'], ['image/jpeg', '.jpg'],
  ['image/gif', '.gif'], ['image/webp', '.webp'], ['image/avif', '.avif'],
]);

/** MIME types by file extension, for local images. */
export const IMAGE_EXTENSIONS: ReadonlyMap<string, string> = new Map([
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'], ['.webp', 'image/webp'], ['.avif', 'image/avif'],
]);

export interface RemoteImageOptions {
  /** Per request, in milliseconds. Default 30,000. */
  timeout?: number;
  /** Largest accepted image, in bytes. Default 25 MiB. */
  maxBytes?: number;
  /** Largest total of all images fetched by one fetcher, in bytes. Default 200 MiB. */
  maxTotalBytes?: number;
  /** Refuse loopback, private, link-local, and other non-public addresses. Default false. */
  blockPrivateNetwork?: boolean;
}

export interface RemoteImage {
  url: string;
  type: string;
  data: Buffer;
}

/** A remote image could not be used; the message names the cause and how to fix it. */
export class RemoteImageError extends Error {
  constructor(readonly url: string, message: string) {
    super(message);
    this.name = 'RemoteImageError';
  }
}

export const DEFAULT_REMOTE_IMAGE_OPTIONS = Object.freeze({
  timeout: 30_000,
  maxBytes: 25 * 1024 * 1024,
  maxTotalBytes: 200 * 1024 * 1024,
  blockPrivateNetwork: false,
});
const MAX_REDIRECTS = 5;

/** Addresses that are not on the public internet. */
const privateAddresses = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) privateAddresses.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of [
  // IPv4-mapped addresses (::ffff:0:0/96) are checked as IPv4 by isPrivateAddress; listing that
  // range here would match every IPv4 address.
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64], ['2001:db8::', 32],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) privateAddresses.addSubnet(network, prefix, 'ipv6');

/** Whether an IP address is loopback, private, link-local, or otherwise not public. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped) return privateAddresses.check(mapped, 'ipv4');
  return privateAddresses.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

/** Strip the brackets URL hostnames put around IPv6 addresses. */
function hostAddress(hostname: string): string {
  return hostname.startsWith('[') ? hostname.slice(1, -1) : hostname;
}

/** Reject a host whose name or resolved addresses are private. Used for browser requests too. */
export async function checkPublicHost(hostname: string): Promise<void> {
  const host = hostAddress(hostname);
  const addresses = isIP(host) ? [host] : await new Promise<string[]>((resolve, reject) =>
    dnsLookup(host, { all: true }, (error, results) => error ? reject(error) : resolve(results.map(result => result.address))));
  const blocked = addresses.find(isPrivateAddress);
  if (blocked !== undefined) throw new Error(`${hostname} resolves to the non-public address ${blocked}`);
}

/** DNS lookup that refuses non-public addresses, so the checked address is the one connected to. */
const publicLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { ...options, all: true }, (error, results: LookupAddress[]) => {
    if (error) return callback(error, '', 0);
    const blocked = results.find(result => isPrivateAddress(result.address));
    if (blocked) return callback(new Error(`${hostname} resolves to the non-public address ${blocked.address}`), '', 0);
    if (options.all) return (callback as unknown as (error: null, addresses: LookupAddress[]) => void)(null, results);
    callback(null, results[0]!.address, results[0]!.family);
  });
};

/** The format the bytes are in, or undefined when they are not a supported image. */
export function sniffImageType(data: Uint8Array): string | undefined {
  const ascii = (start: number, end: number) => String.fromCharCode(...data.subarray(start, end));
  if (data[0] === 0x89 && ascii(1, 4) === 'PNG') return 'image/png';
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 12))) return 'image/avif';
  const head = new TextDecoder().decode(data.subarray(0, 4096)).replace(/^﻿/, '').trimStart().toLowerCase();
  if (/^(?:<\?xml[^>]*>\s*|<!--[\s\S]*?-->\s*|<!doctype svg[^>]*>\s*)*<svg[\s>]/.test(head)) return 'image/svg+xml';
  return undefined;
}

function looksLikeHtml(data: Uint8Array): boolean {
  const head = new TextDecoder().decode(data.subarray(0, 1024)).trimStart().toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
}

/** Advice for share-page URLs from common file hosts, which return a web page rather than the file. */
export function sharePageHint(url: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    const id = /\/d\/([\w-]+)/.exec(parsed.pathname)?.[1] ?? parsed.searchParams.get('id');
    return `Google Drive share links open a web page. Use https://lh3.googleusercontent.com/d/${id ?? '<ID>'} `
      + '(not a documented Google endpoint, so it may change) or download the file and use a local path.';
  }
  if (host === '1drv.ms' || host === 'onedrive.live.com' || host.endsWith('.sharepoint.com')) {
    return 'OneDrive and SharePoint share links open a web page. Download the file and use a local path.';
  }
  if (host === 'www.dropbox.com' || host === 'dropbox.com') {
    return 'Dropbox share links open a web page. Change dl=0 to raw=1, or download the file.';
  }
  return undefined;
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${Number((bytes / 1024 / 1024).toFixed(1))} MiB` : `${Math.ceil(bytes / 1024)} KiB`;
}

function describe(url: string): string {
  return url.length > 200 ? `${url.slice(0, 200)}…` : url;
}

/**
 * Fetches remote images in Node, so the browser's CORS and CORP rules do not apply. Sends no
 * cookies or credentials, follows at most 5 redirects, and fetches each URL once.
 */
export class RemoteImageFetcher {
  readonly options: Required<RemoteImageOptions>;
  #images = new Map<string, Promise<RemoteImage>>();
  #total = 0;

  constructor(options: RemoteImageOptions = {}) {
    this.options = { ...DEFAULT_REMOTE_IMAGE_OPTIONS, ...Object.fromEntries(
      Object.entries(options).filter(([, value]) => value !== undefined)) };
  }

  /** The image at an HTTP(S) URL; failures are not cached, so a later call retries. */
  fetch(url: string): Promise<RemoteImage> {
    let image = this.#images.get(url);
    if (!image) {
      image = this.#download(url);
      this.#images.set(url, image);
      image.catch(() => this.#images.delete(url));
    }
    return image;
  }

  async #download(original: string): Promise<RemoteImage> {
    const fail = (message: string, hint?: string): never => {
      throw new RemoteImageError(original, `${message}: ${describe(original)}${hint ? `. ${hint}` : ''}`);
    };
    let url = new URL(original);
    for (let redirects = 0; ; redirects++) {
      if (!['http:', 'https:'].includes(url.protocol)) fail(`Remote images must use HTTP or HTTPS, not ${url.protocol}`);
      if (url.username || url.password) fail('Remote image URLs must not contain credentials');
      if (this.options.blockPrivateNetwork && isPrivateAddress(hostAddress(url.hostname))) {
        fail(`Remote image blocked: ${url.hostname} is not a public address`);
      }
      let response: IncomingMessage;
      try {
        response = await this.#request(url);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        fail(/timed out/i.test(reason) ? `Remote image timed out after ${this.options.timeout} ms`
          : /non-public address/.test(reason) ? `Remote image blocked: ${reason}`
            : `Cannot download remote image (${reason})`);
      }
      const status = response!.statusCode ?? 0;
      if (status >= 300 && status < 400 && response!.headers.location) {
        response!.resume();
        if (redirects >= MAX_REDIRECTS) fail(`Remote image redirected more than ${MAX_REDIRECTS} times`);
        url = new URL(response!.headers.location, url);
        continue;
      }
      if (status < 200 || status >= 300) {
        response!.resume();
        fail(`Remote image returned HTTP ${status}`);
      }
      const data = await this.#read(response!, fail);
      const declared = (response!.headers['content-type'] ?? '').split(';')[0]!.trim().toLowerCase();
      const sniffed = sniffImageType(data);
      if (declared === 'text/html' || (!sniffed && looksLikeHtml(data))) {
        fail('Remote image is a web page, not an image', sharePageHint(original) ?? sharePageHint(url.href));
      }
      if (!sniffed) fail(`Remote image is not SVG, PNG, JPEG, GIF, WebP, or AVIF (Content-Type: ${declared || 'none'})`);
      // A generic or missing type is accepted when the bytes are a supported image.
      const generic = ['', 'application/octet-stream', 'binary/octet-stream', 'application/binary'].includes(declared);
      if (!generic && declared !== sniffed) fail(`Remote image says it is ${declared} but contains ${sniffed}`);
      return { url: original, type: sniffed!, data };
    }
  }

  #request(url: URL): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
        method: 'GET',
        headers: { accept: 'image/avif,image/webp,image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5', 'user-agent': 'SlideForge' },
        timeout: this.options.timeout,
        ...(this.options.blockPrivateNetwork ? { lookup: publicLookup } : {}),
      }, resolve);
      request.on('timeout', () => request.destroy(new Error('timed out')));
      request.on('error', reject);
      request.end();
    });
  }

  async #read(response: IncomingMessage, fail: (message: string, hint?: string) => never): Promise<Buffer> {
    const limit = this.options.maxBytes;
    const tooLarge = () => fail(`Remote image is larger than ${formatSize(limit)}`);
    if (Number(response.headers['content-length'] ?? 0) > limit) {
      response.destroy();
      tooLarge();
    }
    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => response.destroy(new Error('timed out')), this.options.timeout);
    try {
      for await (const chunk of response as AsyncIterable<Buffer>) {
        size += chunk.length;
        if (size > limit) {
          response.destroy();
          tooLarge();
        }
        chunks.push(chunk);
      }
    } catch (error) {
      if (error instanceof RemoteImageError) throw error;
      fail(/timed out/i.test(String(error)) ? `Remote image timed out after ${this.options.timeout} ms`
        : `Cannot download remote image (${error instanceof Error ? error.message : String(error)})`);
    } finally {
      clearTimeout(timer);
    }
    this.#total += size;
    if (this.#total > this.options.maxTotalBytes) {
      fail(`Remote images exceed ${formatSize(this.options.maxTotalBytes)} in total`);
    }
    return Buffer.concat(chunks);
  }
}

/** A data URL for an image. */
export function dataUrl(type: string, data: Uint8Array): string {
  return `data:${type};base64,${Buffer.from(data).toString('base64')}`;
}
