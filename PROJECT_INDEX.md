# Project Index: ekylibre-plugins/doc

Generated: 2026-05-31 · Ruby 3.0 · Nanoc static site

## What it is

User-facing documentation for the Ekylibre solution (French). Static site compiled with [Nanoc](https://nanoc.app/) into `public/`, deployed to GitHub Pages at https://ekylibre.github.io/doc/. All asset URLs are hard-prefixed with `/doc/` to match the sub-path.

## Project Structure

```
.
├── content/
│   ├── fr/                  # French docs (16 chapter HTML pages, ~2.3k images)
│   │   ├── chapitre1..10.html, annexes.html, demarrage.html,
│   │   │   ekyviti.html, notes-version.html, performance.html, videos.html
│   │   ├── images/, imports/ (CSV/ODS samples)
│   ├── techdoc/             # Tech docs in markdown (currently: install/, index.md)
│   ├── images/, fonts/, javascripts/, stylesheets/
│   ├── index.html, faq.html
├── layouts/                 # ERB layouts: default, start, docs, blog
├── lib/
│   ├── default.rb           # autoloaded by Nanoc, requires filters/helpers
│   ├── filters/             # 7 HTML post-processing filters (see below)
│   ├── helpers/             # download.rb, nav.rb
│   ├── data_sources/repo_docs.rb   # versioned-docs sparse-checkout (DORMANT)
│   └── tasks/
├── Rules                    # compile/route dispatcher (kramdown vs redcarpet)
├── nanoc.yaml               # output_dir: public, auto_prune
├── Gemfile / Gemfile.lock   # Ruby 3.0 (.ruby-version)
├── Guardfile                # nanoc + livereload for `nanoc live`
├── .github/workflows/pages.yml   # GitHub Pages deploy on master
├── public/                  # build output
├── illustrations/, pdf/     # supplementary assets
└── tmp/                     # nanoc tmp + repo_docs clones
```

## Build pipeline (the "big picture")

1. **`Rules`** is the dispatcher. Per-path `compile` blocks chain filters then a layout:
   - `/fr/**/*.md` → kramdown → `start.html` (no .md files exist today; rule is latent)
   - `/fr/**/*.html` → `default.html` (this is what every chapter page actually uses)
   - `/techdoc/**/*.md` → redcarpet → `normalize_links` → `version_warning` → `add_anchors` → `bootstrappify` → `admonition` → `colorize_syntax` (pygments) → `config_linker` (if title=Configuration) → `toc` → `docs.html`
   - `/index.*`, `/faq.*` → `start.html`
   - Catch-all `/**/*` just writes through.
2. **`lib/default.rb`** auto-requires every file under `lib/` so filters/helpers are visible to Nanoc before compilation.
3. **Live reload**: `Guardfile` watches `nanoc.yaml`, `Rules`, `content|layouts|lib/**`; LiveReload watches `public/`.

## Custom filters (`lib/filters/`)

All run on `/techdoc/**/*.md` after redcarpet:

- `normalize_links.rb` — rewrites links for the active doc version (repo_docs data source)
- `version_warning.rb` — injects an out-of-date banner when not viewing latest
- `add_anchors.rb` — adds `<a name="…">` anchors to headings
- `bootstrappify.rb` — rewrites tables, admonitions, etc. for Bootstrap markup
- `admonition.rb` — converts `!!! note` blocks to styled callouts (Nanoc.ws-style)
- `config_linker.rb` — auto-links configuration keys (only runs on items titled "Configuration")
- `toc.rb` — builds the in-page table of contents

## Versioned-docs data source (currently dormant)

`lib/data_sources/repo_docs.rb` is a custom Nanoc data source that:
- clones a remote bare git repo into `tmp/repo_docs/`
- enumerates `release-*` branches matching `vMAJOR.MINOR.PATCH`
- sparse-checks-out the `techdoc/` folder per version
- mounts items at `/<version>/` + a `/latest/` alias
- reads LTS releases from `lts.yml`

**Not wired in `nanoc.yaml`** — that only declares the default `filesystem` data source today. The `lts.yml` file is also absent. Treat as off until both are restored.

## Commands

```bash
bundle install                          # gems (Ruby 3.0)
bundle exec nanoc                       # build → public/
bundle exec nanoc live                  # dev server :3000 + livereload
bundle exec nanoc check internal_links  # validate internal links
bundle exec nanoc check external_links  # validate external links
```

## Deployment

Push to `master` → `.github/workflows/pages.yml` builds and publishes to GitHub Pages (https://ekylibre.github.io/doc/). No other deploy paths.

## Known inconsistencies

- **`.gitignore` excludes `output/`** (legacy) but builds write to `public/`, which IS committed.
- `/fr/**/*.md` rule exists but no markdown files live under `content/fr/`; only HTML.

## Configuration

| File | Purpose |
|---|---|
| `nanoc.yaml` | output dir, prune, filesystem data source, check excludes |
| `Rules` | compile/route filter chains |
| `Gemfile` | nanoc, kramdown, redcarpet, nokogiri, pygments.rb, semverse, guard-* |
| `.ruby-version` | Ruby 3.0 |
| `Guardfile` | livereload + nanoc watchers |
| `.github/workflows/pages.yml` | GH Pages build+deploy on master |

## Entry points for editing

- A French chapter page → edit `content/fr/chapitreN.html` (rendered via `default.html`)
- Homepage / FAQ → `content/index.html` / `content/faq.html` (rendered via `start.html`)
- A tech-doc page → `content/techdoc/**/*.md` (renders via `docs.html` with the full filter chain)
- Layout/CSS tweaks → `layouts/*.html` + `content/stylesheets/`
- New filter behaviour → add to `lib/filters/`, then reference in `Rules`

## Counts

- 16 French chapter HTML pages
- 3 techdoc markdown files (index + install/index + install/data_model)
- ~2,312 images under `content/fr/images/`
- 7 custom Nanoc filters, 2 helpers, 4 layouts

## Quick start

```bash
bundle install
bundle exec nanoc live   # → http://localhost:3000
# edit content/fr/chapitre*.html or content/techdoc/**/*.md
# build is incremental + auto-pruned
```
