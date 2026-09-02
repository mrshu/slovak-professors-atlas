// scripts/screenshot.mjs
// Usage: npx vite preview --port 4173 & NODE_PATH=<dir containing playwright-core> node scripts/screenshot.mjs
// playwright-core is not a project dependency; point NODE_PATH at a sibling
// project's node_modules that has it and a downloaded Chromium.
import { createRequire } from 'node:module'

const require = createRequire(`${process.env.NODE_PATH ?? process.cwd()}/`)
const { chromium } = require('playwright-core')

const browser = await chromium.launch()
for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport })
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#mapa circle')
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
  console.log(name, { height, width })
  if (name === 'desktop' && height > 3500) process.exitCode = 1
  if (name === 'phone' && (height > 6000 || width > 390)) process.exitCode = 1
  await page.close()
}
await browser.close()
