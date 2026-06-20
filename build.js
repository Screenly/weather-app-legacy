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
