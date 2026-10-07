# Golam Ahammad Sunny — portfolio website

Personal and academic portfolio for the architect Golam Ahammad Sunny (GitHub: **gXahammad**).
White, minimal and image-led. Everything the owner might want to change — name, menu, projects,
images, texts, CV, research, contact details, even button labels — is edited in a visual editor
at **`/admin/`**. Only the design lives in code.

- **Website:** [Astro 7](https://astro.build), fully static. Uploaded photos are resized into responsive WebP images at build time.
- **Editor:** [Sveltia CMS](https://sveltiacms.app) — a Git-based CMS. Every "Save" is a commit to this repository; there is no database and no server to maintain.
- **Hosting:** GitHub Pages, free. A GitHub Action rebuilds and publishes the site on every commit, so edits are live 1–3 minutes after saving.

The owner's manual is [EDITING-GUIDE.md](EDITING-GUIDE.md).

> **All content is placeholder.** The projects, drawings, research entries, CV, email address and
> portrait are samples that show the layout. See [Before launch](#before-launch).

---

## 1. Run it locally

Requires Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

- Website: http://localhost:4321
- Editor: http://localhost:4321/admin/index.html — click **Work with Local Repository** and choose this
  folder (Chrome or Edge only). Edits are written straight to the files here; commit them with Git.
  The folder must be a Git repository (`git init` has been run).

Other commands: `npm run build` (output in `dist/`), `npm run preview` (serve the build), `npm run check` (type check).

## 2. Publish on GitHub Pages

1. Sign in to GitHub as **gXahammad** (create the account if it doesn't exist yet).
2. Create a **public** repository named exactly **`gxahammad.github.io`**. That name makes the site appear at
   `https://gxahammad.github.io` with no extra path. (Pages on private repositories needs a paid plan.)
3. Push this project:
   ```bash
   git add -A
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/gXahammad/gxahammad.github.io.git
   git push -u origin main
   ```
4. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Open the **Actions** tab and wait for "Deploy to GitHub Pages" to finish. The site is live at
   https://gxahammad.github.io and the editor at https://gxahammad.github.io/admin/.

Using another account or repository name? Change `repo:` in [public/admin/config.yml](public/admin/config.yml),
and `SITE`/`BASE` in [astro.config.mjs](astro.config.mjs) (a repository not named `<user>.github.io` is served
from `/<repository-name>/`, so `BASE` must be `'/<repository-name>'`).

## 3. Sign in to the editor

Only people with write access to the repository can sign in. Two options:

### Access token (works immediately)

On the editor's sign-in screen, **Sign In Using Access Token** links to GitHub's token page with the right
permission pre-selected. Create a fine-grained token for the `gxahammad.github.io` repository with
**Contents: Read and write**, then paste it. The browser remembers it. Fine-grained tokens expire (you choose
when, up to a year); create a new one when it does.

### "Sign In with GitHub" (nicer for the owner, about 15 minutes, free)

1. Deploy [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) to Cloudflare Workers
   (free account; the README has a one-click deploy button). Note the worker address, e.g.
   `https://sveltia-cms-auth.<subdomain>.workers.dev`.
2. On GitHub, signed in as gXahammad: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   Authorization callback URL: `<worker address>/callback`. Generate a client secret.
3. In the worker's **Settings → Variables**, add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (encrypted) and
   `ALLOWED_DOMAINS` = `gxahammad.github.io`.
4. In [public/admin/config.yml](public/admin/config.yml), uncomment `base_url` with the worker address and change
   `auth_methods` to `[oauth, token]`. Commit and push.

## 4. Custom domain (optional)

Add a `public/CNAME` file containing the domain (e.g. `www.example.com`), configure DNS as described in
[GitHub's guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site), then set
`SITE` in [astro.config.mjs](astro.config.mjs), `site_url` in [public/admin/config.yml](public/admin/config.yml) and
`ALLOWED_DOMAINS` on the worker (if used) to the new domain.

## How it fits together

```
public/admin/config.yml     Editor configuration: every field the owner can edit
public/admin/index.html     Loads Sveltia CMS from unpkg
src/content/projects/       One Markdown file per project
src/content/research/       One Markdown file per research entry
src/content/pages/          Home, Work, Research, About, Contact and 404 pages (JSON)
src/content/settings/       Name, contact details, social links, menu (JSON)
src/assets/uploads/         Every image and file uploaded in the editor
src/lib/content.ts          Reads the content above, with a default for every field
src/lib/media.ts            Resolves uploaded files; photos are optimised, other files published as-is
src/integrations/uploads.mjs  Publishes PDFs and other non-photo uploads at /uploads/<name>
src/components/, src/pages/ Templates
src/styles/                 The design: global.css (type, grid, shared parts), pages.css (page layouts)
```

- **Field names are shared** by [public/admin/config.yml](public/admin/config.yml) and
  [src/lib/content.ts](src/lib/content.ts). Rename a field in both places or not at all.
- **Content can't break the build.** Collection schemas accept anything, and `content.ts` replaces missing,
  empty or malformed values with defaults. Empty sections simply don't render.
- **Images.** The editor stores uploads in `src/assets/uploads` and references them as `/uploads/<name>`.
  It converts photos to WebP and caps them at 3000 px before upload (iPhone HEIC photos included). At build
  time each photo is resized into several widths. PDFs, SVGs and other files are copied unchanged, so a CV
  link such as `/uploads/cv.pdf` never changes. The GitHub Action caches optimised images between builds.
- **Order.** Projects follow the order set with **Reorder** in the editor (stored as `order` in each file;
  new projects get the next number, so they start at the end). Research is sorted by year, newest first.
- **Home page** is built from a list of sections (slideshow, statement, selected projects, research list,
  large image, text with image, contact prompt) that the owner can add, remove and reorder.
- **Validating the editor configuration.** The first line of `config.yml` points VS Code's YAML extension at
  the Sveltia CMS schema, which flags misspelled options as you type. Sveltia also reports configuration
  errors on its sign-in screen.
- **CMS version.** `public/admin/index.html` loads the latest Sveltia CMS. To freeze it, change the URL to a
  fixed version, e.g. `https://unpkg.com/@sveltia/cms@0.227.0/dist/sveltia-cms.js`.

## Before launch

Replace in the editor (or in the files above):

- [ ] Email address (currently `hello@example.com`), phone and address — **Site settings → Name, contact & social links**
- [ ] Portrait, biography, CV PDF, CV sections and skills — **Pages → About page**
- [ ] All six sample projects and their drawings — **Projects**
- [ ] The three sample research entries and the sample PDF — **Research & writing**
- [ ] Home page statement and slideshow — **Pages → Home page**
- [ ] Description and link-preview image — **Site settings**
- [ ] Delete unused sample files in the editor's **Assets** view (the drawings, `cv-placeholder.pdf`, `paper-placeholder.pdf`)
