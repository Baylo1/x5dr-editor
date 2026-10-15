// @vitest-environment jsdom
// Tests for scripts/build.mjs (Release Plan A1). Builds into a temp folder,
// never into dist/.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { build } from './build.mjs';

const ROOT = resolve(__dirname, '..');
const SRC = join(ROOT, 'src');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const quiet = () => {};

// "WxH" from a PNG's IHDR chunk.
const pngSize = (path) => {
  const b = readFileSync(path);
  expect(b.subarray(1, 4).toString('latin1')).toBe('PNG');
  return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`;
};

const moduleScript = (html) => {
  const all = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  return { count: all.length, code: all[0]?.[1] ?? '' };
};

describe('build of the real src/', () => {
  let tmp, html, script;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'x5dr-build-'));
    build({ outDir: tmp, log: quiet });
    html = readFileSync(join(tmp, 'index.html'), 'utf8');
    script = moduleScript(html);
  });
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it('emits exactly one module script and no external scripts', () => {
    expect(script.count).toBe(1);
    expect(html).not.toMatch(/<script[^>]*\bsrc=/);
  });

  it('leaves no import/export statements or module paths', () => {
    expect(script.code).not.toMatch(/^\s*import\s/m);
    expect(script.code).not.toMatch(/^\s*export\s/m);
    expect(html).not.toMatch(/['"]\.\/(midi|state|ui)\//);
  });

  it('passes node --check as a module', () => {
    const file = join(tmp, 'module-script.mjs');
    writeFileSync(file, script.code);
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('inlined modules export the same names and constants as the real modules', async () => {
    // Evaluate only the module IIFEs (the page script needs a full app DOM).
    const modulePart = script.code.split('// ─── src/index.html ───')[0];
    const vars = [...modulePart.matchAll(/^const (__m_\w+) = \(\(\) => \{/gm)].map(m => m[1]);
    // Every non-test module under src/ is inlined (all are imported by
    // index.html); a new module needs no change here (Landmine #123).
    const srcModules = readdirSync(SRC, { recursive: true })
      .filter(f => f.endsWith('.js') && !f.endsWith('.test.js'));
    expect(vars.length).toBe(srcModules.length);
    const inlined = new Function(`"use strict";\n${modulePart}\nreturn { ${vars.join(', ')} };`)();
    for (const v of vars) {
      const rel = v.replace(/^__m_/, '').replace('_', '/') + '.js';
      const real = await import(join(SRC, rel));
      const got = inlined[v];
      expect(Object.keys(got).sort(), rel).toEqual(Object.keys(real).sort());
      for (const k of Object.keys(real)) {
        if (typeof real[k] === 'function') expect(typeof got[k], `${rel} ${k}`).toBe('function');
        else expect(got[k], `${rel} ${k}`).toEqual(real[k]);
      }
    }
    // One behavioural spot check across a module boundary (sysex → effectLayout).
    const real = await import(join(SRC, 'midi/sysex.js'));
    expect([...inlined.__m_midi_sysex.buildModeChange(0x03)]).toEqual([...real.buildModeChange(0x03)]);
  });

  it('keeps both factory banks byte-identical to src', () => {
    const src = readFileSync(join(SRC, 'index.html'), 'utf8');
    for (const name of ['FACTORY_SOUNDS_SYX_BASE64', 'FACTORY_SOUNDS_B_SYX_BASE64']) {
      const re = new RegExp(`const ${name} = "([A-Za-z0-9+/=]+)"`);
      const want = src.match(re)?.[1];
      expect(want, name).toBeTruthy();
      expect(html.match(re)?.[1], name).toBe(want);
    }
  });

  it('embeds the fonts and drops the Google Fonts links', () => {
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    const faces = [...html.matchAll(/@font-face \{ font-family: '([^']+)'[^}]*base64,([A-Za-z0-9+/=]+)\)/g)];
    expect(faces.map(f => f[1])).toEqual(['Inter', 'IBM Plex Mono', 'IBM Plex Mono']);
    const files = ['inter-latin-wght-normal.woff2', 'ibm-plex-mono-latin-400-normal.woff2', 'ibm-plex-mono-latin-500-normal.woff2'];
    faces.forEach((f, i) => {
      expect(Buffer.from(f[2], 'base64').equals(readFileSync(join(SRC, 'fonts', files[i]))), files[i]).toBe(true);
    });
    expect(existsSync(join(tmp, 'fonts', 'OFL-Inter.txt'))).toBe(true);
    expect(existsSync(join(tmp, 'fonts', 'OFL-IBM-Plex-Mono.txt'))).toBe(true);
    expect(existsSync(join(tmp, 'fonts', 'inter-latin-wght-normal.woff2'))).toBe(false);
  });

  it('APP_VERSION equals package.json version', () => {
    expect(script.code).toContain(`const APP_VERSION = '${pkg.version}';`);
  });

  it('ships manifest.json next to the page, with every listed icon', () => {
    expect(html).toContain('<link rel="manifest" href="manifest.json">');
    const manifest = JSON.parse(readFileSync(join(tmp, 'manifest.json'), 'utf8'));
    for (const icon of manifest.icons ?? []) {
      expect(existsSync(join(tmp, icon.src)), icon.src).toBe(true);
    }
  });

  // Release Plan B1: what Chrome/Edge need to offer Install.
  it('lists the 192 and 512 icons and a 512 maskable icon, each PNG at its stated size', () => {
    const manifest = JSON.parse(readFileSync(join(tmp, 'manifest.json'), 'utf8'));
    expect(manifest.id).toBe('./');
    expect(manifest.categories?.length).toBeGreaterThan(0);
    const has = (sizes, purpose) => manifest.icons.some(i => i.sizes === sizes && (i.purpose ?? 'any') === purpose && i.type === 'image/png');
    expect(has('192x192', 'any')).toBe(true);
    expect(has('512x512', 'any')).toBe(true);
    expect(has('512x512', 'maskable')).toBe(true);
    for (const icon of manifest.icons) {
      expect(pngSize(join(tmp, icon.src)), icon.src).toBe(icon.sizes);
    }
  });

  it('links the favicon and the 180px apple-touch icon, and ships both', () => {
    expect(html).toContain('<link rel="icon" href="icons/favicon.svg" type="image/svg+xml">');
    expect(html).toContain('<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">');
    expect(readFileSync(join(tmp, 'icons', 'favicon.svg'), 'utf8')).toMatch(/^<svg[\s>]/);
    expect(pngSize(join(tmp, 'icons', 'apple-touch-icon.png'))).toBe('180x180');
  });

  it('ships only the app icons: no masters, README or social preview', () => {
    expect(readdirSync(join(tmp, 'icons')).sort()).toEqual([
      'apple-touch-icon.png', 'favicon.svg', 'icon-192.png', 'icon-512-maskable.png', 'icon-512.png',
    ]);
    // module-script.mjs is this file's own node --check copy, not build output.
    expect(readdirSync(tmp).filter(f => f !== 'module-script.mjs').sort()).toEqual(['fonts', 'icons', 'index.html', 'manifest.json']);
  });

  it('keeps the SPDX line and adds the build stamp', () => {
    expect(html).toMatch(/^<!DOCTYPE html>\n<!-- SPDX-License-Identifier: MIT -->\n<!-- Built by scripts\/build\.mjs /);
  });
});

// Minimal fake src/ to prove the build refuses what it can't inline.
function makeFixture({ main = '', modules = {}, version = pkg.version, manifest = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'x5dr-build-src-'));
  mkdirSync(join(dir, 'fonts'));
  for (const f of ['inter-latin-wght-normal.woff2', 'ibm-plex-mono-latin-400-normal.woff2', 'ibm-plex-mono-latin-500-normal.woff2']) {
    copyFileSync(join(SRC, 'fonts', f), join(dir, 'fonts', f));
  }
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest));
  for (const [name, code] of Object.entries({ 'a.js': 'export function a() { return 1; }\n', ...modules })) {
    writeFileSync(join(dir, name), code);
  }
  writeFileSync(join(dir, 'index.html'), `<!DOCTYPE html>
<!-- SPDX-License-Identifier: MIT -->
<html><head>
  <!-- Fonts: test -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">
</head><body>
<script type="module">
  import { a } from './a.js';
  const APP_VERSION = '${version}';
${main}
</script>
</body></html>
`);
  return dir;
}

describe('build refuses what it cannot inline', () => {
  const dirs = [];
  const run = (opts) => {
    const srcDir = makeFixture(opts);
    const outDir = mkdtempSync(join(tmpdir(), 'x5dr-build-out-'));
    dirs.push(srcDir, outDir);
    return () => build({ srcDir, outDir, log: quiet });
  };
  afterAll(() => dirs.forEach(d => rmSync(d, { recursive: true, force: true })));

  it('accepts the minimal fixture (and "import (" inside a comment)', () => {
    expect(run({ modules: { 'a.js': '// see the import (Landmine #42)\nexport function a() {}\n' } })).not.toThrow();
  });
  it.each([
    ['default import', { main: "import b from './a.js';" }, /default or namespace import/],
    ['namespace import', { main: "import * as b from './a.js';" }, /default or namespace import/],
    ['dynamic import', { main: "const m = import('./a.js');" }, /dynamic import/],
    ['export default', { modules: { 'a.js': 'export function a() {}\nexport default a;\n' } }, /export default/],
    ['export list', { modules: { 'a.js': 'function a() {}\nexport { a };\n' } }, /export \{/],
    ['export *', { modules: { 'a.js': "export function a() {}\nexport * from './b.js';\n" } }, /export \*/],
    ['fetch', { main: "fetch('x.json');" }, /fetch/],
    ['missing export', { main: "import { nope } from './a.js';" }, /"nope" is not exported/],
    ['missing module', { main: "import { z } from './z.js';" }, /not found/],
    ['bare specifier', { main: "import { z } from 'z';" }, /non-relative import/],
    ['version mismatch', { version: '0.0.0-test' }, /APP_VERSION '0\.0\.0-test'/],
    ['missing icon', { manifest: { icons: [{ src: 'icons/nope.png' }] } }, /Icon icons\/nope\.png is referenced but missing/],
    ['icon outside src/', { manifest: { icons: [{ src: '../secret.png' }] } }, /must be relative and inside src/],
    ['absolute icon URL', { manifest: { icons: [{ src: 'https://example.com/i.png' }] } }, /must be relative and inside src/],
    ['import cycle', { modules: { 'a.js': "import { b } from './b.js';\nexport function a() {}\n", 'b.js': "import { a } from './a.js';\nexport function b() {}\n" } }, /import cycle/],
  ])('%s', (_name, opts, error) => {
    expect(run(opts)).toThrow(error);
  });
});
