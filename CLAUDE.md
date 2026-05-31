# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

User-facing documentation for the Ekylibre solution, built as a static site with [Nanoc](https://nanoc.app/) (Ruby). French content lives under `content/fr/`. Output is written to `public/` (note: `nanoc.yaml` sets `output_dir: public`, not the default `output/` — the `.gitignore` still excludes `output/` from a previous configuration).

Site is served from **GitHub Pages under the `/doc/` sub-path** (https://ekylibre.github.io/doc/). All asset URLs in `layouts/start.html`, `layouts/docs.html`, and `content/index.html` are hard-prefixed with `/doc/` — if you ever change the host or sub-path, search-replace `/doc/` across `layouts/` and `content/`.

## Common commands

```bash
bundle install                  # install gems (Ruby 3.0)
bundle exec nanoc               # compile site → public/
bundle exec nanoc live          # live-reload dev server at http://localhost:3000 (uses Guardfile)
bundle exec nanoc check internal_links   # validate internal links
bundle exec nanoc check external_links   # validate external links
```

Deploy: push to `master`. `.github/workflows/pages.yml` builds and publishes to GitHub Pages — no manual deploy command.

> Note: when running `nanoc live` locally, assets resolve to `http://localhost:3000/doc/...` which **does not** exist on the dev server (it serves `/`). To preview locally, either temporarily revert the `/doc/` prefix or browse via `http://localhost:3000/doc/...` after symlinking, or run a static server with a `/doc/` mount.

## Architecture

This is a Nanoc site, so the pipeline is: files in `content/` → filters/layouts defined in `Rules` → output in `public/`. Three things are worth knowing before editing:

1. **`Rules` is the dispatcher.** Each `compile` block matches a path pattern and chains filters + a layout. The `/fr/**/*.md` path uses kramdown + `start.html` layout; `/techdoc/**/*.md` uses redcarpet plus a long chain of custom filters (`normalize_links`, `version_warning`, `add_anchors`, `bootstrappify`, `admonition`, `colorize_syntax` via Pygments, `config_linker`, `toc`) and the `docs.html` layout. When adding a new content area, add a matching `compile` rule — files without one fall through to the catch-all `compile '/**/*'` which just copies them through.

2. **Custom filters and helpers live in `lib/`** and are auto-loaded by Nanoc before compilation (see `lib/default.rb`). Filters in `lib/filters/` transform HTML between kramdown/redcarpet and the layout (e.g. `bootstrappify.rb` rewrites tables/admonitions for Bootstrap, `toc.rb` builds the page TOC). Helpers in `lib/helpers/` are mixed into layouts/items.

3. **`lib/data_sources/repo_docs.rb` mounts versioned docs from external git repos.** It clones a remote bare repo into `tmp/repo_docs/`, lists `release-*` branches matching `vMAJOR.MINOR.PATCH` tags, sparse-checks-out the `techdoc/` (`DOCS_DIRECTORY`) folder for each version, and exposes every version's items under `/<version>/` plus a `/latest/` alias. LTS releases are read from `lts.yml`. This data source is referenced by the `repo_docs` identifier in `nanoc.yaml`'s `data_sources` section — but the current `nanoc.yaml` only declares the default `filesystem` data source, so this code path is dormant unless re-enabled. Layouts/templates under `layouts/` are Prometheus-derived and still carry Prometheus metadata; review before reusing them for new pages.

## Editing content

- French docs: `content/fr/*.html` (chapter pages) — these are rendered via `default.html` layout, not markdown.
- Markdown French docs go through kramdown + `start.html`.
- After editing, rerun `bundle exec nanoc` (or keep `nanoc live` running). `nanoc.yaml` has `prune.auto_prune: true`, so stale files in `public/` are removed automatically on each build.
