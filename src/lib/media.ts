import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { url } from './utils';

// Every photo uploaded through the editor, keyed by its path in the repository.
const uploadedImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/uploads/**/*.{jpg,jpeg,png,webp,avif,tif,tiff,JPG,JPEG,PNG,WEBP,AVIF,TIF,TIFF}',
  { eager: true },
);

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** "/uploads/photo.webp" (as saved by the editor) → "/src/assets/uploads/photo.webp". */
function repositoryPath(src: string): string | null {
  let value = src.trim();
  if (!value || /^([a-z]+:)?\/\//i.test(value) || value.startsWith('data:')) return null;
  try {
    value = decodeURI(value);
  } catch {
    /* keep the raw value */
  }
  value = value.split(/[?#]/)[0];
  if (BASE && value.startsWith(`${BASE}/`)) value = value.slice(BASE.length);
  if (value.startsWith('uploads/') || value.startsWith('src/')) value = `/${value}`;
  if (value.startsWith('/uploads/')) return `/src/assets${value}`;
  if (value.startsWith('/src/assets/uploads/')) return value;
  return null;
}

/** The optimisable image behind an editor path, or null for external/unknown files. */
export function localImage(src?: string | null): ImageMetadata | null {
  if (!src) return null;
  const key = repositoryPath(src);
  return key ? (uploadedImages[key]?.default ?? null) : null;
}

/**
 * Width and height of an uploaded image. Reads them from a copy: reading the
 * imported object directly makes Astro publish the full-size original as well.
 */
export function dimensions(meta: ImageMetadata): { width: number; height: number } {
  const copy = (meta as ImageMetadata & { clone?: ImageMetadata }).clone ?? meta;
  return { width: copy.width, height: copy.height };
}

/** The public address of an uploaded file (PDF, SVG…) or an external link. */
export function fileUrl(src?: string | null): string {
  const value = src?.trim();
  if (!value) return '';
  if (/^([a-z]+:)?\/\//i.test(value) || /^(data|mailto|tel):/i.test(value)) return value;
  const key = repositoryPath(value);
  return url(key ? key.replace('/src/assets', '') : value);
}

/**
 * A single resized copy of an image, e.g. for link previews or icons.
 * When a height is given the image is cropped to that aspect ratio.
 */
export async function imageAt(
  src: string | null | undefined,
  width: number,
  options: { height?: number; format?: 'webp' | 'png' | 'jpeg' } = {},
): Promise<{ src: string; width: number; height: number } | null> {
  const meta = localImage(src);
  if (!meta) return src ? { src: fileUrl(src), width: 0, height: 0 } : null;

  const original = dimensions(meta);
  const w = Math.min(width, original.width);
  const h = options.height ? Math.round((w * options.height) / width) : Math.round((w * original.height) / original.width);
  const image = await getImage({ src: meta, width: w, height: h, format: options.format ?? 'webp', quality: 82 });
  return { src: image.src, width: w, height: h };
}
