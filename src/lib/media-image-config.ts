/**
 * Which uploaded pictures Next's image optimiser may fetch and resize.
 *
 * Kept free of imports so `next.config.ts` can use it. The optimiser only
 * ever fetches from the public media host and only under `business/`, so it
 * cannot be used as an open proxy for other paths on that host.
 */
export type MediaRemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: string;
};

function parseBase(baseUrl: string | undefined): URL | null {
  if (!baseUrl?.trim()) return null;
  try {
    const url = new URL(baseUrl.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function basePath(url: URL): string {
  return url.pathname.replace(/\/+$/, "");
}

export function mediaRemotePattern(
  baseUrl: string | undefined,
): MediaRemotePattern | null {
  const url = parseBase(baseUrl);
  if (!url) return null;
  return {
    protocol: url.protocol === "https:" ? "https" : "http",
    hostname: url.hostname,
    port: url.port,
    pathname: `${basePath(url)}/business/**`,
  };
}

/** True when `imageUrl` matches the pattern the optimiser is configured with. */
export function isOptimisableMediaUrl(
  imageUrl: string,
  baseUrl: string | undefined,
): boolean {
  const base = parseBase(baseUrl);
  if (!base) return false;
  let image: URL;
  try {
    image = new URL(imageUrl);
  } catch {
    return false;
  }
  return (
    image.protocol === base.protocol &&
    image.hostname === base.hostname &&
    image.port === base.port &&
    image.pathname.startsWith(`${basePath(base)}/business/`) &&
    !image.pathname.includes("..")
  );
}
