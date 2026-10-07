// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import uploads from './src/integrations/uploads.mjs';

/*
 * Where the site is published.
 * - GitHub user site (repository named "gxahammad.github.io"): https://gxahammad.github.io, no base path.
 * - Custom domain: set SITE to the domain, e.g. https://www.example.com, and add public/CNAME.
 * - Repository with any other name: BASE must be '/<repository-name>'.
 * Both can also be set with the SITE_URL and BASE_PATH environment variables.
 */
const SITE = process.env.SITE_URL || 'https://gxahammad.github.io';
const BASE = process.env.BASE_PATH || '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  // HTML-aware whitespace handling keeps the spaces between inline elements.
  compressHTML: true,
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  integrations: [uploads(), sitemap()],
});
