// Files uploaded in the editor are stored in src/assets/uploads and referenced
// in content as /uploads/<name>.
//
// - Photos (JPEG, PNG, WebP, AVIF, TIFF) are optimised by Astro into responsive
//   sizes at build time (see src/lib/media.ts), so they are not copied as-is.
// - Every other file (PDF, SVG, GIF, documents, video) is published unchanged at
//   /uploads/<name>, which keeps addresses such as a CV link stable.
//
// During `astro dev` all uploads are served from /uploads/ directly.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const OPTIMIZED_IMAGE = /\.(jpe?g|png|webp|avif|tiff?)$/i;

const CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8',
};

/** @returns {import('astro').AstroIntegration} */
export default function uploads() {
  let uploadsDir = '';

  return {
    name: 'portfolio-uploads',
    hooks: {
      'astro:config:setup': ({ config, updateConfig }) => {
        uploadsDir = fileURLToPath(new URL('./src/assets/uploads/', config.root));
        const prefix = `${config.base.replace(/\/+$/, '')}/uploads/`;

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'portfolio-uploads-dev',
                configureServer(server) {
                  server.middlewares.use((req, res, next) => {
                    let pathname = (req.url ?? '').split('?')[0];
                    try {
                      pathname = decodeURIComponent(pathname);
                    } catch {
                      return next();
                    }
                    if (!pathname.startsWith(prefix)) return next();

                    const file = path.resolve(uploadsDir, pathname.slice(prefix.length));
                    const inside = file.startsWith(path.resolve(uploadsDir) + path.sep);
                    if (!inside || !existsSync(file) || !statSync(file).isFile()) return next();

                    const type = CONTENT_TYPES[path.extname(file).toLowerCase()];
                    res.setHeader('Content-Type', type ?? 'application/octet-stream');
                    createReadStream(file).pipe(res);
                  });
                },
              },
            ],
          },
        });
      },

      'astro:build:done': async ({ dir, logger }) => {
        if (!existsSync(uploadsDir)) return;
        const outDir = path.join(fileURLToPath(dir), 'uploads');
        let copied = 0;
        await cp(uploadsDir, outDir, {
          recursive: true,
          filter: (source) => {
            if (statSync(source).isDirectory()) return true;
            const keep = !OPTIMIZED_IMAGE.test(source);
            if (keep) copied++;
            return keep;
          },
        });
        logger.info(`Published ${copied} uploaded file(s) at /uploads/`);
      },
    },
  };
}
