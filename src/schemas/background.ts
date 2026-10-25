/** Origin of the hosted Math Background Studio, whose share links can be used as backgrounds. */
export const STUDIO_ORIGIN = "https://bg.gordonkit.com";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parse(source: string): URL | undefined {
  if (!/^https?:\/\//i.test(source)) return undefined;
  try {
    return new URL(source);
  } catch {
    return undefined;
  }
}

/** A studio share link (`/studio#d=…`) or render URL (`/render#d=…`) on any host. */
export function looksLikeStudioLink(source: string): boolean {
  const url = parse(source);
  return !!url && /^\/(?:studio|render)\/?$/.test(url.pathname)
    && !!new URLSearchParams(url.hash.slice(1)).get("d");
}

/** Share links are accepted from the hosted studio, or from a loopback development server. */
export function isTrustedStudioLink(source: string): boolean {
  const url = parse(source);
  if (!url || !looksLikeStudioLink(source)) return false;
  return url.origin === STUDIO_ORIGIN || LOOPBACK_HOSTS.has(url.hostname);
}

/** The studio's `/render` page for a trusted share link, which draws only the design. */
export function studioRenderUrl(source: string): string | undefined {
  if (!isTrustedStudioLink(source)) return undefined;
  const url = new URL(source);
  url.pathname = "/render";
  url.search = "";
  return url.href;
}
