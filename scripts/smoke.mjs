#!/usr/bin/env node
/**
 * Smoke test — pings every page/asset of the CxE EMEA Step Tracker and exits
 * non-zero if any return non-200 or look obviously broken. Runs against an
 * already-running dev server on http://localhost:4173 by default; override
 * with the BASE_URL env var for a deployed site (e.g. GitHub Pages preview):
 *
 *   BASE_URL=https://manaiakalani.github.io/CxEEMEAStepTracker node scripts/smoke.mjs
 */
import { request } from 'node:http';
import { request as httpsRequest } from 'node:https';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:4173').replace(/\/$/, '');

// path → array of substrings that MUST appear in the response body.
// Empty array = just check 200. We pick fingerprints unique to each page
// so a misrouted SPA fallback (e.g. main app served at /admin/) is caught.
const TARGETS = [
  ['/',                          ['CxE EMEA Offsite 2026', 'id="weeklyChart"']],
  ['/index.html',                ['CxE EMEA Offsite 2026']],
  ['/live-display/',             ['Live Leaderboard', 'individualLeaderboard']],
  ['/admin-login.html',          ['admin/dist/#/login']],
  ['/admin-dashboard.html',      ['admin/dist/#/']],
  ['/admin/dist/',               ['CxE EMEA Admin', 'id="root"']],
  ['/manifest.json',             ['"start_url"', 'CxE EMEA']],
  ['/sw.js',                     ['CACHE_VERSION', '2026-emea']],
  ['/styles.css',                ['--brand-alpine']],
  ['/script.js',                 []],
  ['/gamification.js',           ['frauenkirche']],
  ['/favicon.svg',               ['<svg']],
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = (url.startsWith('https') ? httpsRequest : request)(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.setTimeout(10_000, () => req.destroy(new Error('timeout')));
    req.end();
  });
}

let failures = 0;
console.log(`Smoke testing ${BASE_URL}\n`);
for (const [path, fingerprints] of TARGETS) {
  const url = BASE_URL + path;
  try {
    const { status, body } = await fetchText(url);
    const missing = fingerprints.filter((f) => !body.includes(f));
    if (status !== 200 || missing.length) {
      failures++;
      console.log(`  ✗ ${status}  ${path}`);
      if (missing.length) console.log(`       missing fingerprints: ${missing.map(JSON.stringify).join(', ')}`);
    } else {
      console.log(`  ✓ ${status}  ${path}`);
    }
  } catch (err) {
    failures++;
    console.log(`  ✗ ERR  ${path}  (${err.message})`);
  }
}

console.log(`\n${failures === 0 ? 'All ' + TARGETS.length + ' pages OK ✅' : failures + ' / ' + TARGETS.length + ' failed ❌'}`);
process.exit(failures === 0 ? 0 : 1);
