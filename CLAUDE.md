# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is the Screenly Weather App. It is a Cloudflare Worker that server-renders a full-screen weather display for Screenly digital signage. Live at `weather.srly.io`.

The app doubles as a Screenly advertisement: viewers are non-Screenly users, so the UI carries a rotating CTA pitching Screenly. See the auto-memory note `app-is-screenly-advertisement.md` for the CTA/accuracy guardrails.

## Commands

Package manager is **Bun** (not npm/yarn). CI pins Bun 1.3.14.

```bash
bun install                  # install deps (also installs wrangler locally)
bun run dev                  # wrangler dev on port 8888
bun test                     # run all tests
bun test --watch             # watch mode
bun test src/routes/weather.test.js   # run a single test file
bun run lint                 # biome lint, fails on warnings (matches CI)
bun run lint:fix             # biome lint --write
bun run format               # biome format --write
bun run build                # minify static JS/CSS in place + vendor fonts
bun run sync-fonts           # vendor @fontsource webfonts into assets/
```

Deploy is via wrangler envs: `bunx wrangler deploy --env [dev|stage|production]`. CI auto-deploys: push to `master` -> stage, push to `production` -> production. PRs run lint + test.

## Architecture

### Two runtimes, one repo

The code is split across two execution contexts that never share a module:

1. **Worker (SSR)** — `src/`, JSX via `hono/jsx` (see `jsconfig.json`). Runs on Cloudflare Workers. Entry is `src/index.jsx` (set in `wrangler.toml` `main`).
2. **Browser (client)** — `assets/static/js/`. Plain browser scripts served as static files. All the live behavior (fetching weather, clock, locale, animations, CTA rotation) happens here.

The SSR output is a static HTML shell with empty placeholders (`#city`, `#current-temp`, etc.). `main.js` fills them in at runtime by calling the worker's own `/api/weather` endpoint.

### Request flow (`src/index.jsx`)

- `GET /` redirects (301) to a canonical `?lat=&lng=` URL when either coord is missing. Resolution order: query params > Screenly asset-metadata headers (`x-screenly-lat/lng`) > Cloudflare GeoIP (`request.cf`) > `defaultLocation` (San Francisco). See `src/constants.js`.
- With both coords present, the HTML is server-rendered and stored in the edge page cache (`caches.default`) for 12h.
- `GET /api/weather` (`src/routes/weather.js`) proxies OpenWeatherMap's forecast API, keeping `OPEN_WEATHER_API_KEY` server-side. Response cached 3h. Has a 10s upstream timeout -> 504, other upstream failures -> 502.

### Cache-busting (important, easy to break)

`ASSET_VERSION` is a hash of the static-asset manifest, computed at worker startup. It changes on every deploy that changes any asset. It is:
- folded into the **SSR page-cache key**, so a deploy lands on a fresh key instead of pairing stale HTML with new assets;
- appended as `?v=<version>` to every asset URL (CSS/fonts/JS in `Layout.jsx`, and JS-built image URLs via `window.__ASSET_V` in `main.js`).

Versioned `/static/*` requests get `immutable` 1-year cache; unversioned (legacy cached HTML) get a 5-min TTL. Read the long comments in `src/index.jsx` before touching any of this.

### The `main.js` / `locale.js` split (do not break)

`assets/static/js/main.js` MUST stay a self-executing script with **no top-level `export`**. The build (`build.js`) bundles it with `Bun.build({ external: [] })` so its `import` of `locale.js` is inlined. This keeps the served bundle loadable by every cached HTML variant (plain `<script>` and `type="module"`), so a deploy never strands cached pages.

Therefore all unit-testable pure helpers (locale resolution, temp conversion, time/date formatting, condition categorization) live in `assets/static/js/locale.js` as real ES exports — `test/locale.test.js` imports them directly. Add testable logic to `locale.js`, not `main.js`.

### Build is destructive

`build.js` minifies JS/CSS **in place**, overwriting the source files in `assets/`. It also vendors webfonts from `@fontsource` packages into `assets/static/fonts/` (no CDN). Don't run `bun run build` and commit the minified output as if it were source.

## Conventions

- **Biome** is the linter+formatter (config in `biome.json`): single quotes, no semicolons, no trailing commas, 2-space indent, 100-col width. `bun run lint` fails on warnings.
- Tests use `bun:test` (`describe`/`it`/`expect`/`mock`). Worker tests stub the Cloudflare-only `__STATIC_CONTENT_MANIFEST` and `hono/cloudflare-workers` via `mock.module`, and stub the Cache API — see the setup block in `src/index.test.js`.
- No em-dashes in copy or comments (auto-memory `no-em-dashes.md`).
