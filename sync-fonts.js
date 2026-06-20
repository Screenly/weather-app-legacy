#!/usr/bin/env bun
/* global Bun */
// Copies the self-hosted webfont files out of the Bun-managed @fontsource
// package and into ./assets/static/fonts, where wrangler's [site] config
// serves them at /static/fonts/. Bun owns the font version (package.json);
// this step vendors the exact files we ship and serve ourselves — no CDN.

const FONT_PKG = '@fontsource/inter/files'
const WEIGHTS = [400, 500, 700]
const DEST_DIR = 'assets/static/fonts'

export const run = async () => {
  let count = 0

  for (const weight of WEIGHTS) {
    const file = `inter-latin-${weight}-normal.woff2`
    const src = Bun.file(`node_modules/${FONT_PKG}/${file}`)

    if (!(await src.exists())) {
      console.error(`✗ Missing ${file} — run \`bun install\` first.`)
      process.exit(1)
    }

    await Bun.write(`${DEST_DIR}/${file}`, src)
    console.log(`✓ Font: ${DEST_DIR}/${file}`)
    count++
  }

  console.log(`Fonts synced — ${count} file(s) vendored from ${FONT_PKG}.`)
}

// Allow running standalone: `bun run sync-fonts.js`
if (import.meta.main) {
  await run()
}
