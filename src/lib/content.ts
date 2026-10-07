// Reads everything the editor (public/admin/config.yml) writes and turns it into
// clean, typed data with defaults. Field names here must match the config file.
// Missing files, empty fields and unexpected values never break the build: they
// fall back to the defaults below.
import { getCollection, type CollectionEntry } from 'astro:content';
import { isExternal, slugify, videoEmbed, yearValue } from './utils';

type Json = Record<string, unknown>;

const jsonFiles = import.meta.glob<Json>('/src/content/{pages,settings}/*.json', { eager: true, import: 'default' });

function readJson(name: string): Json {
  const data = jsonFiles[`/src/content/${name}.json`];
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
}

// ------------------------------------------------------------- coercion helpers
const str = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value.trim() || fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
};
const bool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);
const num = (value: unknown, fallback: number): number => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const obj = (value: unknown): Json => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {});
const strings = (value: unknown): string[] => list(value).map((v) => str(v)).filter(Boolean);
const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

function labels<T extends Record<string, string>>(value: unknown, defaults: T): T {
  const source = obj(value);
  const out: Record<string, string> = { ...defaults };
  for (const key of Object.keys(defaults)) out[key] = str(source[key], defaults[key]);
  return out as T;
}

export interface Link {
  label: string;
  url: string;
}
const links = (value: unknown): Link[] =>
  list(value)
    .map(obj)
    .map((item) => ({ label: str(item.label), url: str(item.url) }))
    .filter((item) => item.url)
    .map((item) => ({ ...item, label: item.label || item.url.replace(/^https?:\/\/(www\.)?/, '') }));

// -------------------------------------------------------------------- settings
export interface Site {
  name: string;
  role: string;
  location: string;
  headerText: string;
  logo: string;
  email: string;
  phone: string;
  address: string;
  social: Link[];
  description: string;
  shareImage: string;
  favicon: string;
  footerText: string;
  copyright: string;
  labels: { menu: string; close: string; back_to_top: string; skip: string; previous: string; next: string; pause: string; play: string };
}

export function getSite(): Site {
  const d = readJson('settings/site');
  const name = str(d.name, 'Golam Ahammad Sunny');
  return {
    name,
    role: str(d.role),
    location: str(d.location),
    headerText: str(d.header_text, name),
    logo: str(d.logo),
    email: str(d.email),
    phone: str(d.phone),
    address: str(d.address),
    social: links(d.social),
    description: str(d.description),
    shareImage: str(d.share_image),
    favicon: str(d.favicon),
    footerText: str(d.footer_text),
    copyright: str(d.copyright, `© ${new Date().getFullYear()} ${name}`),
    labels: labels(d.labels, {
      menu: 'Menu',
      close: 'Close',
      back_to_top: 'Back to top',
      skip: 'Skip to content',
      previous: 'Previous',
      next: 'Next',
      pause: 'Pause slideshow',
      play: 'Play slideshow',
    }),
  };
}

export interface NavItem {
  label: string;
  href: string;
  page: string;
  external: boolean;
}

const PAGE_PATHS: Record<string, string> = {
  home: '/',
  work: '/work/',
  research: '/research/',
  about: '/about/',
  contact: '/contact/',
};

export function getNavigation(): NavItem[] {
  const d = readJson('settings/navigation');
  const source = Array.isArray(d.items)
    ? d.items
    : [
        { label: 'Work', page: 'work' },
        { label: 'Research', page: 'research' },
        { label: 'About', page: 'about' },
        { label: 'Contact', page: 'contact' },
      ];
  return source.map(obj).flatMap((item) => {
    const page = str(item.page, 'custom');
    const href = PAGE_PATHS[page] ?? str(item.url);
    const label = str(item.label);
    return label && href ? [{ label, href, page, external: isExternal(href) }] : [];
  });
}

// ----------------------------------------------------------------------- pages
export type HomeSection =
  | { type: 'slideshow'; slides: { project: string; image: string; alt: string; title: string; caption: string }[]; interval: number; height: 'full' | 'large' | 'medium' }
  | { type: 'statement'; text: string; buttonLabel: string; buttonLink: string }
  | { type: 'projects'; heading: string; selection: string[]; limit: number; layout: 'staggered' | 'grid'; linkLabel: string }
  | { type: 'research'; heading: string; selection: string[]; limit: number; linkLabel: string }
  | { type: 'image'; image: string; alt: string; caption: string; link: string }
  | { type: 'text_image'; heading: string; text: string; image: string; alt: string; imageSide: 'left' | 'right'; buttonLabel: string; buttonLink: string }
  | { type: 'contact'; heading: string; text: string; buttonLabel: string; buttonLink: string };

function homeSection(raw: unknown): HomeSection | null {
  const s = obj(raw);
  switch (s.type) {
    case 'slideshow': {
      const slides = list(s.slides)
        .map(obj)
        .map((v) => ({ project: str(v.project), image: str(v.image), alt: str(v.alt), title: str(v.title), caption: str(v.caption) }))
        .filter((v) => v.image || v.project);
      return slides.length
        ? { type: 'slideshow', slides, interval: Math.min(30, Math.max(2, num(s.interval, 6))), height: oneOf(s.height, ['full', 'large', 'medium'] as const, 'large') }
        : null;
    }
    case 'statement':
      return str(s.text) ? { type: 'statement', text: str(s.text), buttonLabel: str(s.button_label), buttonLink: str(s.button_link) } : null;
    case 'projects':
      return {
        type: 'projects',
        heading: str(s.heading),
        selection: strings(s.selection),
        limit: Math.max(1, Math.round(num(s.limit, 6))),
        layout: oneOf(s.layout, ['staggered', 'grid'] as const, 'staggered'),
        linkLabel: str(s.link_label),
      };
    case 'research':
      return { type: 'research', heading: str(s.heading), selection: strings(s.selection), limit: Math.max(1, Math.round(num(s.limit, 4))), linkLabel: str(s.link_label) };
    case 'image':
      return str(s.image) ? { type: 'image', image: str(s.image), alt: str(s.alt), caption: str(s.caption), link: str(s.link) } : null;
    case 'text_image':
      return str(s.heading) || str(s.text) || str(s.image)
        ? {
            type: 'text_image',
            heading: str(s.heading),
            text: str(s.text),
            image: str(s.image),
            alt: str(s.alt),
            imageSide: oneOf(s.image_side, ['left', 'right'] as const, 'right'),
            buttonLabel: str(s.button_label),
            buttonLink: str(s.button_link),
          }
        : null;
    case 'contact':
      return str(s.heading) ? { type: 'contact', heading: str(s.heading), text: str(s.text), buttonLabel: str(s.button_label), buttonLink: str(s.button_link, '/contact') } : null;
    default:
      return null;
  }
}

export function getHomePage() {
  const d = readJson('pages/home');
  return {
    sections: list(d.sections).map(homeSection).filter((s): s is HomeSection => s !== null),
    seoTitle: str(d.seo_title),
    seoDescription: str(d.seo_description),
  };
}

export function getWorkPage() {
  const d = readJson('pages/work');
  return {
    title: str(d.title, 'Work'),
    intro: str(d.intro),
    categories: list(d.categories).map((c) => str(obj(c).name)).filter(Boolean),
    showFilters: bool(d.show_filters, true),
    defaultView: oneOf(d.default_view, ['grid', 'index'] as const, 'grid'),
    labels: labels(d.labels, {
      all: 'All',
      grid: 'Grid',
      index: 'Index',
      empty: 'Projects will appear here soon.',
      col_title: 'Project',
      col_category: 'Category',
      col_location: 'Location',
      col_year: 'Year',
      location: 'Location',
      year: 'Year',
      status: 'Status',
      category: 'Category',
      links: 'Links',
      next: 'Next project',
      back: 'All work',
    }),
    seoDescription: str(d.seo_description),
  };
}

export function getResearchPage() {
  const d = readJson('pages/research');
  return {
    title: str(d.title, 'Research'),
    intro: str(d.intro),
    showFilters: bool(d.show_filters, true),
    labels: labels(d.labels, {
      all: 'All',
      empty: 'Research and writing will appear here soon.',
      abstract: 'Abstract',
      authors: 'Authors',
      publication: 'Published in',
      type: 'Type',
      year: 'Year',
      pdf: 'Read the PDF',
      link: 'View publication',
      back: 'All research',
    }),
    seoDescription: str(d.seo_description),
  };
}

export interface CvEntry {
  period: string;
  title: string;
  subtitle: string;
  location: string;
  description: string;
  link: string;
}

export function getAboutPage() {
  const d = readJson('pages/about');
  return {
    title: str(d.title, 'About'),
    heading: str(d.heading),
    portrait: str(d.portrait),
    portraitAlt: str(d.portrait_alt),
    portraitCaption: str(d.portrait_caption),
    bio: str(d.bio),
    cvFile: str(d.cv_file),
    cvLabel: str(d.cv_label, 'Download CV'),
    sections: list(d.sections)
      .map(obj)
      .map((s) => ({
        title: str(s.title),
        entries: list(s.entries)
          .map(obj)
          .map(
            (e): CvEntry => ({
              period: str(e.period),
              title: str(e.title),
              subtitle: str(e.subtitle),
              location: str(e.location),
              description: str(e.description),
              link: str(e.link),
            }),
          )
          .filter((e) => e.title || e.subtitle || e.description),
      }))
      .filter((s) => s.title || s.entries.length),
    skills: list(d.skills)
      .map(obj)
      .map((g) => ({ title: str(g.title), items: strings(g.items) }))
      .filter((g) => g.items.length),
    seoDescription: str(d.seo_description),
  };
}

export function getContactPage() {
  const d = readJson('pages/contact');
  const form = obj(d.form);
  return {
    title: str(d.title, 'Contact'),
    heading: str(d.heading),
    intro: str(d.intro),
    image: str(d.image),
    imageAlt: str(d.image_alt),
    labels: labels(d.labels, { email: 'Email', phone: 'Phone', address: 'Address', social: 'Elsewhere' }),
    form: {
      enabled: bool(form.enabled, false) && /^https:\/\//.test(str(form.endpoint)),
      endpoint: str(form.endpoint),
      ...labels(form, {
        heading: 'Send a message',
        name_label: 'Name',
        email_label: 'Email',
        message_label: 'Message',
        submit_label: 'Send',
        success_message: 'Thank you — your message has been sent.',
        error_message: 'Sorry, something went wrong. Please email me directly.',
      }),
    },
    seoDescription: str(d.seo_description),
  };
}

export function getNotFoundPage() {
  const d = readJson('pages/not-found');
  return {
    title: str(d.title, 'Page not found'),
    text: str(d.text, 'The page you are looking for has moved or no longer exists.'),
    buttonLabel: str(d.button_label, 'Back to the home page'),
  };
}

// -------------------------------------------------------------------- projects
export interface Picture {
  image: string;
  alt: string;
  caption: string;
}

export type Block =
  | ({ type: 'image'; size: 'full' | 'wide' | 'medium' } & Picture)
  | { type: 'pair'; items: Picture[] }
  | { type: 'gallery'; columns: number; images: Picture[] }
  | { type: 'text'; heading: string; text: string }
  | { type: 'quote'; text: string; attribution: string }
  | { type: 'video'; embed: string; caption: string };

function block(raw: unknown): Block | null {
  const b = obj(raw);
  switch (b.type) {
    case 'image':
      return str(b.image)
        ? { type: 'image', image: str(b.image), alt: str(b.alt), caption: str(b.caption), size: oneOf(b.size, ['full', 'wide', 'medium'] as const, 'wide') }
        : null;
    case 'pair': {
      const items = [
        { image: str(b.image_1), alt: '', caption: str(b.caption_1) },
        { image: str(b.image_2), alt: '', caption: str(b.caption_2) },
      ].filter((i) => i.image);
      if (items.length === 2) return { type: 'pair', items };
      return items.length === 1 ? { type: 'image', size: 'wide', ...items[0] } : null;
    }
    case 'gallery': {
      const images = list(b.images)
        .map(obj)
        .map((i) => ({ image: str(i.image), alt: str(i.alt), caption: str(i.caption) }))
        .filter((i) => i.image);
      return images.length ? { type: 'gallery', columns: Math.min(4, Math.max(2, Math.round(num(b.columns, 3)))), images } : null;
    }
    case 'text':
      return str(b.text) || str(b.heading) ? { type: 'text', heading: str(b.heading), text: str(b.text) } : null;
    case 'quote':
      return str(b.text) ? { type: 'quote', text: str(b.text), attribution: str(b.attribution) } : null;
    case 'video': {
      const embed = videoEmbed(str(b.url));
      return embed ? { type: 'video', embed, caption: str(b.caption) } : null;
    }
    default:
      return null;
  }
}

export interface Project {
  slug: string;
  title: string;
  published: boolean;
  order: number | null;
  year: string;
  location: string;
  categories: string[];
  status: string;
  summary: string;
  cover: string;
  coverAlt: string;
  cardImage: string;
  cardImageHover: string;
  facts: { label: string; value: string }[];
  body: string;
  blocks: Block[];
  links: Link[];
}

function toProject(entry: CollectionEntry<'projects'>): Project {
  const d = entry.data as Json;
  const title = str(d.title, entry.id);
  return {
    slug: entry.id,
    title,
    published: bool(d.published, true),
    order: typeof d.order === 'number' && Number.isFinite(d.order) ? d.order : null,
    year: str(d.year),
    location: str(d.location),
    categories: strings(d.categories),
    status: str(d.status),
    summary: str(d.summary),
    cover: str(d.cover),
    coverAlt: str(d.cover_alt, title),
    cardImage: str(d.card_image),
    cardImageHover: str(d.card_image_hover),
    facts: list(d.facts)
      .map(obj)
      .map((f) => ({ label: str(f.label), value: str(f.value) }))
      .filter((f) => f.label && f.value),
    body: entry.body ?? '',
    blocks: list(d.blocks).map(block).filter((b): b is Block => b !== null),
    links: links(d.links),
  };
}

/**
 * The order set with "Reorder" in the editor, which also numbers new projects
 * so they come last. Files without a number (added outside the editor) come
 * first, newest year first.
 */
function byOrder(a: Project, b: Project): number {
  if (a.order === null && b.order !== null) return -1;
  if (a.order !== null && b.order === null) return 1;
  if (a.order !== null && b.order !== null && a.order !== b.order) return a.order - b.order;
  return yearValue(b.year) - yearValue(a.year) || a.title.localeCompare(b.title);
}

// Cached for the build; re-read on every request in development so edits show up.
let projectCache: Promise<Project[]> | undefined;
/** All projects that are switched on, in the order set in the editor. */
export function getProjects(): Promise<Project[]> {
  const load = () => getCollection('projects').then((entries) => entries.map(toProject).filter((p) => p.published).sort(byOrder));
  if (import.meta.env.DEV) return load();
  return (projectCache ??= load());
}

/** Category filters: the editor's list order first, then any other categories in use. */
export function projectCategories(projects: Project[], defined: string[]): { name: string; slug: string }[] {
  const used = new Set(projects.flatMap((p) => p.categories));
  const ordered = defined.filter((c) => used.has(c));
  const extra = [...used].filter((c) => !defined.includes(c)).sort((a, b) => a.localeCompare(b));
  return [...ordered, ...extra].map((name) => ({ name, slug: slugify(name) }));
}

// -------------------------------------------------------------------- research
export interface Research {
  slug: string;
  title: string;
  published: boolean;
  type: string;
  year: string;
  authors: string;
  publication: string;
  summary: string;
  cover: string;
  coverAlt: string;
  pdf: string;
  link: string;
  body: string;
}

function toResearch(entry: CollectionEntry<'research'>): Research {
  const d = entry.data as Json;
  const title = str(d.title, entry.id);
  return {
    slug: entry.id,
    title,
    published: bool(d.published, true),
    type: str(d.type),
    year: str(d.year),
    authors: str(d.authors),
    publication: str(d.publication),
    summary: str(d.summary),
    cover: str(d.cover),
    coverAlt: str(d.cover_alt, title),
    pdf: str(d.pdf),
    link: str(d.link),
    body: entry.body ?? '',
  };
}

let researchCache: Promise<Research[]> | undefined;
const byYear = (a: Research, b: Research) => yearValue(b.year) - yearValue(a.year) || a.title.localeCompare(b.title);

/** All research entries that are switched on, newest year first. */
export function getResearch(): Promise<Research[]> {
  const load = () => getCollection('research').then((entries) => entries.map(toResearch).filter((r) => r.published).sort(byYear));
  if (import.meta.env.DEV) return load();
  return (researchCache ??= load());
}

/** Resolves a hand-picked list of slugs (in that order), or falls back to the first items. */
export function pickItems<T extends { slug: string }>(all: T[], selection: string[], limit: number): T[] {
  const picked = selection.map((slug) => all.find((item) => item.slug === slug)).filter((item): item is T => Boolean(item));
  return (picked.length ? picked : all).slice(0, limit);
}
