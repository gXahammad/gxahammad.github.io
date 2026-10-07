const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** True for links to other websites (http/https, or typed as "www.…"). */
export function isExternal(href: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(href.trim());
}

/**
 * Turns a link typed in the editor into a working address:
 * "/about" gets the site's base path, "www.example.com" gets https://,
 * full addresses, mailto: and tel: links are left alone.
 */
export function url(href = '/'): string {
  const value = href.trim();
  if (!value) return `${BASE}/`;
  if (/^(https?:|mailto:|tel:|#)/i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  if (BASE && (value === BASE || value.startsWith(`${BASE}/`))) return value;
  return `${BASE}${value.startsWith('/') ? value : `/${value}`}`;
}

/** The current path without the base path, always starting with "/". */
export function pagePath(pathname: string): string {
  const path = BASE && pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  return path.startsWith('/') ? path : `/${path}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The latest four-digit year in a string such as "2022–2024", for sorting. */
export function yearValue(year: string): number {
  const years = year.match(/\d{4}/g);
  return years ? Math.max(...years.map(Number)) : 0;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** Converts a YouTube or Vimeo page address into an embeddable player address. */
export function videoEmbed(address: string): string | null {
  let link: URL;
  try {
    link = new URL(address.trim());
  } catch {
    return null;
  }
  const host = link.hostname.replace(/^www\.|^m\./, '');
  let id: string | null | undefined = null;

  if (host === 'youtu.be') id = link.pathname.split('/')[1];
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = link.searchParams.get('v') ?? link.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
  }
  if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const vimeo = link.pathname.match(/(\d{5,})/)?.[1];
    if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  }
  return null;
}
