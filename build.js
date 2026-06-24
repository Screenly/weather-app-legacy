#!/usr/bin/env bun
/* global Bun */
// Minifies the static JS and CSS assets in place, replacing the gulp build.
// The assets are served directly from ./assets by wrangler's [site] config and
// referenced at /static/..., so the minified output must overwrite the source.

import { Glob } from 'bun'
import { run as syncFonts } from './sync-fonts.js'

// Vendor the Bun-managed webfonts into ./assets before minifying.
await syncFonts()

const targets = [
  { label: 'JS', glob: 'assets/static/js/*.js' },
  { label: 'CSS', glob: 'assets/static/styles/*.css' }
]

let count = 0

for (const { label, glob } of targets) {
  for await (const path of new Glob(glob).scan('.')) {
    const result = await Bun.build({
      entrypoints: [path],
      minify: true,
      target: 'browser',
      // Keep Bun's default 'esm' format. main.js exposes test helpers via
      // module.exports, so Bun emits it as an ES module ending in `export
      // default Pq()`, where Pq is the lazy factory wrapping the app's init.
      // The page loads it with <script type="module">, which both accepts the
      // `export` and evaluates that statement, invoking Pq() to run the app.
      // Do NOT switch to format:'iife': it strips the export but never calls
      // Pq, so the bundle defines everything and runs nothing (blank page).
      // Leave references untouched (e.g. CSS `url(/static/...)` absolute paths)
      // rather than trying to resolve and bundle them as build-time assets.
      external: ['*']
    })

    if (!result.success) {
      console.error(`✗ Failed to build ${path}`)
      for (const message of result.logs) console.error(message)
      process.exit(1)
    }

    // Build fully into memory before writing, so overwriting the source is safe.
    const minified = await result.outputs[0].text()
    await Bun.write(path, minified)
    console.log(`✓ ${label}: ${path}`)
    count++
  }
}

console.log(`Build complete — ${count} file(s) minified in place.`)
