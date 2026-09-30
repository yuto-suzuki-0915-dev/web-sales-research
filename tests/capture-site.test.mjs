import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCRIPT = path.join(ROOT, 'scripts', 'capture-site.mjs');

test('capture-site produces desktop and mobile evidence', { timeout: 60000 }, () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'web-sales-capture-test-'));
  try {
    const page = path.join(temp, 'index.html');
    fs.writeFileSync(page, '<!doctype html><html><meta name="viewport" content="width=device-width"><body><h1>Visual test</h1><p>desktop and mobile</p></body></html>', 'utf8');
    const out = path.join(temp, 'evidence');
    const result = spawnSync(process.execPath, [SCRIPT, '--url', pathToFileURL(page).href, '--out-dir', out, '--id', 'fixture', '--virtual-time-budget-ms', '1000', '--no-browser-sandbox', 'true'], { encoding: 'utf8', timeout: 60000 });
    assert.equal(result.status, 0, `stderr: ${result.stderr}\nstdout: ${result.stdout}`);
    const metadata = JSON.parse(result.stdout);
    assert.equal(metadata.visual_status, 'verified');
    assert.ok(fs.statSync(metadata.desktop.output).size > 0);
    assert.ok(fs.statSync(metadata.mobile.output).size > 0);
    assert.ok(fs.existsSync(metadata.metadata_path));
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
