import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The schemas accept anything on purpose: content is edited by hand in the CMS,
// and an unexpected value must never stop the site from building. Each field is
// checked and given a sensible default in src/lib/content.ts instead.
const anyFrontmatter = z.looseObject({});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: anyFrontmatter,
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/research' }),
  schema: anyFrontmatter,
});

export const collections = { projects, research };
