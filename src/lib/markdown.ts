import { Marked, type Tokens } from 'marked';
import { getImage } from 'astro:assets';
import { dimensions, fileUrl, localImage } from './media';
import { isExternal, url } from './utils';

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

type SizedImage = Tokens.Image & { width?: number; height?: number };

const markdown = new Marked({
  gfm: true,
  // The editor stores Shift+Enter as a single line break; show it as one.
  breaks: true,
  async: true,
  async walkTokens(token) {
    if (token.type !== 'image') return;
    const image = token as SizedImage;
    const meta = localImage(image.href);
    if (meta) {
      const optimised = await getImage({ src: meta, width: Math.min(1600, dimensions(meta).width), format: 'webp', quality: 80 });
      image.href = optimised.src;
      image.width = Number(optimised.attributes.width) || undefined;
      image.height = Number(optimised.attributes.height) || undefined;
    } else {
      image.href = fileUrl(image.href);
    }
  },
  renderer: {
    // Raw HTML typed into a text field is shown as text, so it can't break the layout.
    html({ text }) {
      return escape(text);
    },
    link({ href, title, tokens }) {
      const target = url(href);
      const external = isExternal(target);
      const titleAttr = title ? ` title="${escape(title)}"` : '';
      const rel = external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${escape(target)}"${titleAttr}${rel}>${this.parser.parseInline(tokens)}</a>`;
    },
    image(token) {
      const { href, text, width, height } = token as SizedImage;
      const size = width && height ? ` width="${width}" height="${height}"` : '';
      return `<img src="${escape(href)}" alt="${escape(text)}"${size} loading="lazy" decoding="async">`;
    },
  },
});

/** Converts Markdown written in the editor into HTML. Empty input gives "". */
export async function renderMarkdown(source?: string | null): Promise<string> {
  if (!source || !source.trim()) return '';
  return markdown.parse(source);
}
