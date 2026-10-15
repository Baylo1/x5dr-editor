// SPDX-License-Identifier: MIT
// Single-file build: src/index.html + its ES modules → dist/index.html.
// Release Plan step A1 (Optimization Plan Workstream D). Node built-ins only.
//
// Each module becomes an IIFE that returns its exports, and each
// `import { a, b as c } from './x.js'` becomes `const { a, b: c } = __m_x;`.
// The result is one inline <script type="module"> (strict mode, no fetch),
// so it runs from https:// and file:// alike. Any import/export form not
// handled here fails the build rather than producing a broken file.
// Google Fonts links are replaced with embedded @font-face rules (src/fonts/).
// manifest.json, icons and font licences are copied next to the page.

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { resolve, dirname, relative, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
let SRC = join(ROOT, 'src'); // set per build() call; tests point it at a fixture

// Embedded fonts. Inter is one variable file covering weights 400–700.
const FONTS = [
  { family: 'Inter', weight: '400 700', file: 'inter-latin-wght-normal.woff2' },
  { family: 'IBM Plex Mono', weight: '400', file: 'ibm-plex-mono-latin-400-normal.woff2' },
  { family: 'IBM Plex Mono', weight: '500', file: 'ibm-plex-mono-latin-500-normal.woff2' },
];
// Latin subset, as Google Fonts defines it.
const LATIN_RANGE = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, ' +
  'U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

class BuildError extends Error {}
const fail = (msg) => { throw new BuildError(msg); };

const IMPORT_RE = /^[ \t]*import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;?[ \t]*$/gm;
const EXPORT_RE = /^export\s+(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm;

// Patterns that can't survive inlining (or need a fetch at runtime).
const UNSUPPORTED = [
  [/^[ \t]*import\s+[\w$*]/m, 'default or namespace import'],
  [/^[ \t]*import\s*['"]/m, 'side-effect import'],
  [/\bimport\s*\(\s*['"`]/, 'dynamic import()'],
  [/\bimport\.meta\b/, 'import.meta'],
  [/^[ \t]*export\s+default\b/m, 'export default'],
  [/^[ \t]*export\s*\*/m, 'export *'],
  [/^[ \t]*export\s*\{/m, 'export { … } list'],
  [/^[ \t]*export\s+(?:const|let|var)\s*[{[]/m, 'destructuring export'],
  [/\bfetch\s*\(/, 'fetch()'],
  [/\bnew\s+URL\s*\(/, 'new URL()'],
  [/<\/script/i, '"</script" inside code'],
];

function checkSupported(code, where) {
  for (const [re, what] of UNSUPPORTED) {
    if (re.test(code)) fail(`${where}: unsupported ${what}`);
  }
}

// `a, b as c` → [{ imported: 'a', local: 'a' }, { imported: 'b', local: 'c' }]
function parseSpecifiers(list, where) {
  return list.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
    if (!m) fail(`${where}: can't parse import specifier "${s}"`);
    return { imported: m[1], local: m[2] || m[1] };
  });
}

function parseImports(code, fromFile) {
  const imports = [];
  for (const m of code.matchAll(IMPORT_RE)) {
    const spec = m[2];
    if (!spec.startsWith('./') && !spec.startsWith('../')) fail(`${fromFile}: non-relative import "${spec}"`);
    imports.push({ statement: m[0], file: resolve(dirname(fromFile), spec), specifiers: parseSpecifiers(m[1], fromFile) });
  }
  // Any `import` left after removing the handled statements is a form we don't support.
  const rest = code.replace(IMPORT_RE, '');
  if (/^[ \t]*import\b/m.test(rest)) fail(`${fromFile}: unsupported import statement`);
  return imports;
}

const moduleVar = (file) => '__m_' + relative(SRC, file).replace(/\.js$/, '').replace(/[^\w]/g, '_');

function destructure(imp) {
  const parts = imp.specifiers.map(s => s.imported === s.local ? s.imported : `${s.imported}: ${s.local}`);
  return `const { ${parts.join(', ')} } = ${moduleVar(imp.file)};`;
}

// Load every module reachable from the page, depth-first, so each module is
// emitted after the modules it imports (topological order).
function collectModules(entryImports) {
  const ordered = [];
  const state = new Map(); // file → 'visiting' | 'done'
  const visit = (file, from) => {
    if (state.get(file) === 'done') return;
    if (state.get(file) === 'visiting') fail(`import cycle at ${relative(SRC, file)}`);
    if (!existsSync(file)) fail(`${from}: imported file not found: ${relative(ROOT, file)}`);
    state.set(file, 'visiting');
    const code = readFileSync(file, 'utf8');
    const where = relative(ROOT, file);
    checkSupported(code.replace(IMPORT_RE, ''), where);
    const imports = parseImports(code, file);
    for (const imp of imports) visit(imp.file, where);
    const exports = [...code.matchAll(EXPORT_RE)].map(m => m[1]);
    if (exports.length === 0) fail(`${where}: no exports found`);
    ordered.push({ file, code, imports, exports });
    state.set(file, 'done');
  };
  for (const imp of entryImports) visit(imp.file, 'src/index.html');
  return ordered;
}

function wrapModule(mod) {
  let body = mod.code;
  for (const imp of mod.imports) body = body.replace(imp.statement, destructure(imp));
  body = body.replace(/^export\s+/gm, '');
  const name = relative(SRC, mod.file);
  return `// ─── ${name} (inlined by scripts/build.mjs) ───\n` +
    `const ${moduleVar(mod.file)} = (() => {\n${body.trimEnd()}\n` +
    `return { ${mod.exports.join(', ')} };\n})();\n`;
}

function checkImportedNamesExist(importsByFile, modules) {
  const exportsOf = new Map(modules.map(m => [m.file, new Set(m.exports)]));
  for (const [from, imports] of importsByFile) {
    for (const imp of imports) {
      for (const s of imp.specifiers) {
        if (!exportsOf.get(imp.file).has(s.imported)) {
          fail(`${from}: "${s.imported}" is not exported by ${relative(ROOT, imp.file)}`);
        }
      }
    }
  }
}

function fontFaceCss() {
  const fontsDir = join(SRC, 'fonts');
  const rules = FONTS.map(f => {
    const path = join(fontsDir, f.file);
    if (!existsSync(path)) fail(`missing font file src/fonts/${f.file}`);
    const b64 = readFileSync(path).toString('base64');
    return `    @font-face { font-family: '${f.family}'; font-style: normal; font-weight: ${f.weight}; ` +
      `font-display: swap; src: url(data:font/woff2;base64,${b64}) format('woff2'); unicode-range: ${LATIN_RANGE}; }`;
  });
  return `  <!-- Fonts: Inter and IBM Plex Mono (SIL Open Font License 1.1; see fonts/), embedded by the build. -->\n` +
    `  <style>\n${rules.join('\n')}\n  </style>`;
}

// The three Google Fonts lines in src/index.html (comment + preconnects + stylesheet).
const FONT_LINKS_RE = /[ \t]*<!-- Fonts:[^\n]*-->\n[ \t]*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\n[ \t]*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>\n[ \t]*<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*" rel="stylesheet">/;

function gitDescribe() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

// The icon files a page needs: every manifest icon plus each <link rel="icon">
// and <link rel="apple-touch-icon"> href. Relative paths only.
export function appIconPaths(html, manifest) {
  const paths = new Set((manifest.icons ?? []).map(i => i.src));
  for (const [, rel, href] of html.matchAll(/<link\s+rel="(icon|apple-touch-icon)"\s+href="([^"]+)"/g)) paths.add(href);
  for (const p of paths) {
    if (/^([a-z]+:|\/)/i.test(p) || p.includes('..')) fail(`Icon path ${p} must be relative and inside src/`);
  }
  return [...paths];
}

export function build({ srcDir = join(ROOT, 'src'), outDir = DIST, log = console.log } = {}) {
  SRC = srcDir;
  const html = readFileSync(join(SRC, 'index.html'), 'utf8');

  // Exactly one module script, and no other external scripts.
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  const moduleScripts = scripts.filter(s => /type="module"/.test(s[1]));
  if (moduleScripts.length !== 1) fail(`expected 1 module script in src/index.html, found ${moduleScripts.length}`);
  if (scripts.some(s => /\bsrc=/.test(s[1]))) fail('src/index.html has an external <script src>');
  const [scriptTag, , mainCode] = moduleScripts[0];

  const entryFile = join(SRC, 'index.html');
  checkSupported(mainCode.replace(IMPORT_RE, ''), 'src/index.html (module script)');
  const entryImports = parseImports(mainCode, entryFile);
  const modules = collectModules(entryImports);
  checkImportedNamesExist([['src/index.html', entryImports], ...modules.map(m => [relative(ROOT, m.file), m.imports])], modules);

  // Version: APP_VERSION must equal package.json's version (Release Plan D7).
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const appVersion = mainCode.match(/const APP_VERSION = '([^']+)'/)?.[1];
  if (!appVersion) fail('APP_VERSION not found in src/index.html');
  if (appVersion !== pkg.version) fail(`APP_VERSION '${appVersion}' ≠ package.json version '${pkg.version}'`);

  let main = mainCode;
  for (const imp of entryImports) main = main.replace(imp.statement, destructure(imp));
  const inlined = '\n' + modules.map(wrapModule).join('\n') + '\n// ─── src/index.html ───\n' + main.replace(/^\n/, '');
  const newScriptTag = scriptTag.replace(mainCode, () => inlined);

  let out = html.replace(scriptTag, () => newScriptTag);
  if (!FONT_LINKS_RE.test(out)) fail('Google Fonts <link> block not found in src/index.html (did its markup change?)');
  out = out.replace(FONT_LINKS_RE, () => fontFaceCss());
  const stamp = `<!-- Built by scripts/build.mjs from ${gitDescribe()}, version ${pkg.version}. Edit src/, not this file. -->`;
  out = out.replace('<!-- SPDX-License-Identifier: MIT -->', m => `${m}\n${stamp}`);

  // Output.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), out);
  copyFileSync(join(SRC, 'manifest.json'), join(outDir, 'manifest.json'));
  // Only the app icons the page and manifest reference ship: src/icons/ also
  // holds the 1024px masters, the design README and the GitHub social preview.
  for (const icon of appIconPaths(out, JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8')))) {
    const from = join(SRC, icon);
    if (!existsSync(from)) fail(`Icon ${icon} is referenced but missing from src/`);
    mkdirSync(dirname(join(outDir, icon)), { recursive: true });
    copyFileSync(from, join(outDir, icon));
  }
  const fontsDir = join(SRC, 'fonts');
  if (existsSync(fontsDir)) {
    mkdirSync(join(outDir, 'fonts'));
    for (const f of readdirSync(fontsDir)) {
      if (f.endsWith('.woff2')) continue; // embedded; only the licences ship
      if (f.startsWith('.')) continue;
      copyFileSync(join(fontsDir, f), join(outDir, 'fonts', f));
    }
  }

  log(`dist/index.html: ${(out.length / 1024).toFixed(0)} KB, ${modules.length} modules inlined ` +
    `(${modules.map(m => relative(SRC, m.file)).join(', ')})`);
  return { outFile: join(outDir, 'index.html'), modules: modules.map(m => posix.normalize(relative(SRC, m.file))) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    build();
  } catch (e) {
    console.error(`Build failed: ${e.message}`);
    process.exit(1);
  }
}
