// Netlify build step (after `vite build`): send the sourcemaps to PostHog so error
// stack traces point at real files and lines, then delete them from dist so they're
// never served publicly. Skipped (maps still deleted) when the keys aren't set.
//
// Uses the official @posthog/cli, pinned by its full scoped name. It's run here
// rather than installed as a dependency because its installer fails on Windows
// paths with spaces — Netlify builds on Linux, where it works.
//
// Netlify env: POSTHOG_PERSONAL_API_KEY (needs "Error tracking: Write" as well as
// "Query: Read") and POSTHOG_PROJECT_ID — the same two the admin's Insights use.
import { execFileSync } from 'node:child_process'
import { readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { POSTHOG_HOST } from '../src/analytics.config.js'

const DIST = 'dist'
const key = (process.env.POSTHOG_PERSONAL_API_KEY || '').trim()
const project = (process.env.POSTHOG_PROJECT_ID || '').trim()

function maps(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? maps(p) : p.endsWith('.map') ? [p] : []
  })
}

if (process.env.NETLIFY && key && project) {
  try {
    execFileSync('npx', ['-y', '--package=@posthog/cli@0.18.9', 'posthog-cli', 'sourcemap', 'process', '--directory', DIST], {
      stdio: 'inherit',
      env: { ...process.env, POSTHOG_CLI_API_KEY: key, POSTHOG_CLI_PROJECT_ID: project, POSTHOG_CLI_HOST: POSTHOG_HOST.replace('.i.posthog.com', '.posthog.com') },
    })
    console.log('Sourcemaps uploaded to PostHog.')
  } catch {
    // never block a deploy over this
    console.warn('Sourcemap upload to PostHog failed — deploying anyway (error traces stay minified for this build).')
  }
} else {
  console.log('Sourcemap upload skipped (only runs on Netlify with POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID).')
}

const found = maps(DIST)
found.forEach((p) => rmSync(p))
console.log(`Removed ${found.length} sourcemap file(s) from ${DIST}/ so they aren't published.`)
