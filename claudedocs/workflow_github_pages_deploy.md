# Workflow Plan — GitHub Actions Deployment to GitHub Pages

**Status**: PLAN ONLY — no files created. Execute via `/sc:implement` or manually.
**Target file**: `.github/workflows/pages.yml` (new)
**Inspiration**: `.gitlab-ci.yml` (existing) + [SamStephens/nanoc-build-pages](https://github.com/SamStephens/nanoc-build-pages)

---

## 1. Context (what the repo already does)

- **Stack**: Nanoc 4.x site, Ruby 3.0.0 (`.ruby-version`), output dir `public/` (set in `nanoc.yaml`, not the Nanoc default `output/`).
- **Existing CI** (`.gitlab-ci.yml`, 11 lines):
  ```yaml
  image: ruby:3.0
  pages:
    script:
      - bundle install -j4
      - bundle exec nanoc
    artifacts:
      paths: [public]
    only: [master]
  ```
- **Default branch**: `master`.
- **Gemfile**: includes `nanoc`, `kramdown`, `redcarpet`, `nokogiri`, `pygments.rb` (needs Python at build time), `webrick`, plus Guard gems (only loaded under the `:nanoc` group — fine to install).

## 2. Reference approach (SamStephens/nanoc-build-pages)

- Docker-based composite action: `ruby:3.2.2` image → `bundle install` → `bundle exec nanoc compile`.
- Designed to be paired with `actions/upload-pages-artifact` + `actions/deploy-pages` (the modern, native GH Pages flow — no `gh-pages` branch).
- Derived from `actions/jekyll-build-pages`.

**Decision**: do NOT use the action verbatim. It pins Ruby 3.2.2, but `Gemfile.lock` was resolved against 3.0 and the GitLab pipeline runs on 3.0. Use `ruby/setup-ruby@v1` with `.ruby-version` instead, so the GitHub workflow matches the GitLab pipeline byte-for-byte at the build step. Adopt SamStephens' deploy pattern (`upload-pages-artifact` + `deploy-pages`), which is the part actually worth borrowing.

## 3. Design choices to confirm with the user

| # | Question | Recommendation | Why |
|---|---------|----------------|-----|
| Q1 | Deploy method: native `actions/deploy-pages` (recommended by GH) **or** legacy `peaceiris/actions-gh-pages` (pushes to a `gh-pages` branch)? | **Native `actions/deploy-pages`** | Modern, no extra branch, matches the SamStephens reference. |
| Q2 | Trigger: only on push to `master`, or also `workflow_dispatch` for manual reruns? | **Both** | Mirrors GitLab's `only: master`, plus a manual button is cheap. |
| Q3 | Keep GitLab CI in parallel, or remove `.gitlab-ci.yml`? | **Keep both for now** | Non-destructive; the user can drop GitLab later. |
| Q4 | Pin Ruby to `3.0` via `.ruby-version`, or upgrade? | **Pin to `.ruby-version` (3.0)** | Avoids resolver churn in `Gemfile.lock`. Upgrade is a separate task. |
| Q5 | Cache `bundle install`? | **Yes — `bundler-cache: true` in `setup-ruby`** | Cuts subsequent runs from ~90s to ~15s. |

## 4. Implementation phases

### Phase 1 — Repo prerequisites (one-time, in GitHub UI)
1. Push the repo to GitHub if not already mirrored.
2. **Settings → Pages → Build and deployment → Source = GitHub Actions** (NOT "Deploy from a branch"). Without this, the deploy step fails with "Pages site not found".
3. Confirm the repo's default branch on GitHub matches what the workflow's `on.push.branches` targets (currently `master`).

### Phase 2 — Author `.github/workflows/pages.yml`

Structure (one workflow, two jobs):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write          # required by actions/deploy-pages OIDC

concurrency:
  group: pages
  cancel-in-progress: false   # don't cancel a running deploy mid-flight

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version-file: .ruby-version   # = 3.0.0
          bundler-cache: true                # cache + bundle install

      # pygments.rb needs Python at runtime — ubuntu-latest has it preinstalled.
      # If a future runner drops Python, add: uses: actions/setup-python@v5

      - run: bundle exec nanoc
        # writes to public/ per nanoc.yaml

      - uses: actions/upload-pages-artifact@v3
        with:
          path: public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Key correctness checks**:
- `path: public` (NOT `output`) — the repo's `nanoc.yaml` overrides the default.
- `permissions` block is mandatory; `deploy-pages` uses OIDC (`id-token: write`).
- `concurrency.group: pages` + `cancel-in-progress: false` is the GH-recommended pattern (avoids partial deploys).
- `environment: github-pages` is required — `deploy-pages` rejects any other environment name.
- Pin action major versions only (`@v4`, `@v1`, `@v3`); Dependabot can bump later.

### Phase 3 — First-run validation
1. Push the workflow → watch **Actions** tab.
2. If build fails on `pygments.rb`: add `sudo apt-get install -y python3` step before `bundle exec nanoc`.
3. If deploy fails with "Pages site not found": Phase 1, step 2 was skipped.
4. Visit the URL from `deploy` job's environment link; spot-check a French chapter page (e.g. `/fr/chapitre1/`) renders.

### Phase 4 — Link/asset sanity (optional, recommended)

Add as a separate non-blocking job (or extend `build`):
```yaml
      - run: bundle exec nanoc check internal_links
```
The `nanoc.yaml` already declares the `internal_links` and `external_links` checkers with empty exclude lists. Internal_links should be safe to gate on; external_links is too flaky for CI — leave manual.

## 5. Things this plan deliberately does NOT do

- **Does not touch `.gitlab-ci.yml`.** Keep dual pipelines until the user decides to migrate fully.
- **Does not handle PR previews.** Native `deploy-pages` does not support multi-environment previews; if needed, switch to `peaceiris/actions-gh-pages` with per-PR subpaths. Out of scope here.
- **Does not configure a custom domain (CNAME).** `documentation.ekylibre.com` currently resolves via the Docker/Traefik deploy on a self-hosted server. If GH Pages becomes the canonical deploy, add a `CNAME` file under `content/` (passthrough-copied) AND configure DNS — separate change.
- **Does not enable the `repo_docs` data source.** That code in `lib/data_sources/repo_docs.rb` references `lts.yml` which doesn't exist; it would break CI if turned on.
- **Does not upgrade Ruby.** A 3.0 → 3.2/3.3 bump may re-resolve `Gemfile.lock` and break gems (especially `nokogiri`, `pygments.rb`). Separate task.

## 6. Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Ruby 3.0 is EOL; `ruby/setup-ruby@v1` may eventually drop it. | Today it still works on `ubuntu-latest`. When it breaks, that's the trigger to upgrade Ruby in a dedicated PR. |
| `pygments.rb` requires Python — silent break if a future runner image drops it. | Pin runner image (`ubuntu-22.04`) instead of `ubuntu-latest` once stable, OR add explicit `actions/setup-python@v5`. |
| First run fails because Pages source wasn't set to "GitHub Actions". | Phase 1, step 2. Document this in the PR description. |
| `nanoc deploy` config still points at `doc:/opt/doc/app/v2` (rsync) — confusing once GH Pages is live. | Out of scope; leave a TODO comment if migrating away from the rsync deploy. |
| `auto_prune: true` in `nanoc.yaml` deletes unmanaged files in `public/` — fine in CI (clean checkout), but the directory is also committed-adjacent. | No action needed; CI checks out fresh. |

## 7. Acceptance criteria

- [ ] `.github/workflows/pages.yml` exists, parses with `actionlint` (or GH validates on push).
- [ ] First push to `master` (or manual dispatch) results in a green `build` + `deploy` run.
- [ ] The published site URL renders `index.html`, at least one French chapter, and the FAQ.
- [ ] `internal_links` check passes (or is documented as TODO if pre-existing failures).
- [ ] No regression in `.gitlab-ci.yml` (untouched).

## 8. Next step

Run `/sc:implement` against this plan, or hand-author `.github/workflows/pages.yml` using the YAML in Phase 2. Before merging, confirm **Settings → Pages → Source = GitHub Actions** on the GitHub repo.
