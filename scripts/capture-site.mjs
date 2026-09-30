#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    result[key] = argv[i + 1];
    i += 1;
  }
  return result;
}

function required(args, key) {
  if (!args[key]) throw new Error(`Missing --${key}`);
  return args[key];
}

function findBrowser(explicit) {
  const candidates = [
    explicit,
    process.env.BROWSER_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error('Chrome or Edge was not found. Pass --browser PATH.');
  return found;
}

function waitForFile(file, timeoutMs = 10000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (fs.existsSync(file) && fs.statSync(file).size > 0) return true;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  return false;
}

function cleanupProfile(profile) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(profile, { recursive: true, force: true });
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    }
  }
}

function capture(browser, url, output, width, height, budget, mobile, noBrowserSandbox) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-browser-'));
  try {
    const args = [
      '--headless',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      '--force-device-scale-factor=1',
      `--virtual-time-budget=${budget}`,
      `--screenshot=${output}`
    ];
    if (noBrowserSandbox) args.push('--no-sandbox');
    if (mobile) {
      args.push('--user-agent=Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36');
    }
    args.push(url);
    execFileSync(browser, args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: Math.max(30000, budget + 20000) });
    if (!waitForFile(output)) throw new Error(`Screenshot was not created: ${output}`);
    return { success: true, output };
  } catch (error) {
    return { success: false, output, error: String(error.stderr || error.message).slice(0, 2000) };
  } finally {
    cleanupProfile(profile);
  }
}

const args = parseArgs(process.argv.slice(2));
try {
  const url = required(args, 'url');
  const outDir = path.resolve(required(args, 'out-dir'));
  const id = required(args, 'id').replace(/[^a-zA-Z0-9-]/g, '-');
  const browser = findBrowser(args.browser);
  const budget = Number(args['virtual-time-budget-ms'] || 5000);
  fs.mkdirSync(outDir, { recursive: true });
  const desktopPath = path.join(outDir, `${id}-top-desktop.png`);
  const mobilePath = path.join(outDir, `${id}-top-mobile.png`);
  const noBrowserSandbox = args['no-browser-sandbox'] === 'true';
  const desktop = capture(browser, url, desktopPath, 1440, 1000, budget, false, noBrowserSandbox);
  const mobile = capture(browser, url, mobilePath, 390, 844, budget, true, noBrowserSandbox);
  const metadata = {
    schema_version: 2,
    lead_id: id,
    page_type: 'top',
    page_url: url,
    browser,
    no_browser_sandbox: noBrowserSandbox,
    captured_at: new Date().toISOString(),
    desktop,
    mobile,
    visual_status: desktop.success && mobile.success ? 'verified' : 'unverified'
  };
  const metadataPath = path.join(outDir, `${id}-metadata.json`);
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ...metadata, metadata_path: metadataPath }, null, 2));
  if (!desktop.success || !mobile.success) process.exitCode = 2;
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
