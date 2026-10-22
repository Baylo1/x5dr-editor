// README screenshots (Release Plan C3). Builds the app into a temp folder,
// serves it on localhost, drives headless Chrome over the DevTools protocol
// and writes docs/images/prog-easy.png and docs/images/combi-timbres.png.
//
//   npm run screenshots
//
// Node built-ins only (Node 22+ for the global WebSocket). Chrome is found at
// the macOS default path; set CHROME_PATH to use another Chrome/Edge binary.
//
// What the shots show: Factory Bank A loaded, slot A00, Warm Graphite. There
// is no X5DR attached, so a stand-in MIDI port ("USB MIDI Interface") ACKs
// every SysEx message and the header shows a connected session; everything
// else is the real app. Each shot grows the window until neither #content nor
// a visible Combi/Multi grid (its own scroll box, Landmine #130) scrolls, then
// crops to #app-shell plus MARGIN, captured at 2x and scaled to
// OUT_WIDTH with macOS `sips` when available.
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'docs', 'images');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WIDTH = 1440;        // window width; the app shell is a fixed 1400px
const MARGIN = 16;         // px of page background kept around the app shell
const OUT_WIDTH = 1600;    // final image width
const DEBUG_PORT = 9333;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Every SysEx gets an ACK (F0 42 30 36 23 F7); these steps request no dumps.
const FAKE_MIDI = `
(() => {
  try {
    localStorage.setItem('x5dr-help-getting-started-seen', '1');
    localStorage.setItem('x5dr-midi-port', 'USB MIDI Interface');
    localStorage.setItem('x5dr-theme', 'warm');
  } catch (e) {}
  const input = { id: 'in1', name: 'USB MIDI Interface', type: 'input', state: 'connected', connection: 'open',
    onmidimessage: null, addEventListener() {}, removeEventListener() {}, open: async () => input, close: async () => input };
  const output = { id: 'out1', name: 'USB MIDI Interface', type: 'output', state: 'connected', connection: 'open',
    open: async () => output, close: async () => output, addEventListener() {}, removeEventListener() {},
    send(data) {
      if (data[0] !== 0xF0) return;
      setTimeout(() => input.onmidimessage && input.onmidimessage({ data: new Uint8Array([0xF0, 0x42, 0x30, 0x36, 0x23, 0xF7]) }), 5);
    } };
  const access = { inputs: new Map([['in1', input]]), outputs: new Map([['out1', output]]), sysexEnabled: true, onstatechange: null };
  navigator.requestMIDIAccess = async () => access;
})();`;

const TYPES = { '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain' };

function serve(dir) {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '') || 'index.html';
    const file = join(dir, path);
    if (!file.startsWith(dir) || !existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

async function main() {
  if (!existsSync(CHROME)) throw new Error(`Chrome not found at ${CHROME}; set CHROME_PATH.`);
  const siteDir = mkdtempSync(join(tmpdir(), 'x5dr-shots-site-'));
  const profile = mkdtempSync(join(tmpdir(), 'x5dr-shots-profile-'));
  build({ outDir: siteDir, log: () => {} });
  const server = await serve(siteDir);
  const siteUrl = `http://127.0.0.1:${server.address().port}/`;
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

  let ws;
  try {
    let ver;
    for (let i = 0; i < 50 && !ver; i++) {
      try { ver = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).json(); } catch { await sleep(200); }
    }
    if (!ver) throw new Error('Chrome did not start its DevTools endpoint.');

    ws = new WebSocket(ver.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));
    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (!m.id || !pending.has(m.id)) return;
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    });
    const send = (method, params = {}, sessionId) => {
      const msg = { id: ++id, method, params, ...(sessionId && { sessionId }) };
      ws.send(JSON.stringify(msg));
      return new Promise((res, rej) => pending.set(msg.id, { res, rej }));
    };

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    const js = async (expr) => {
      const r = await s('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const W = 'await new Promise(r => setTimeout(r, 400));';

    // Grow the window until nothing scrolls (#content or a visible grid), then crop to the app shell.
    const shot = async (name) => {
      let height = 900;
      for (let i = 0; i < 10; i++) {
        await s('Emulation.setDeviceMetricsOverride', { width: WIDTH, height, deviceScaleFactor: 2, mobile: false });
        await sleep(400);
        const over = await js(`const c = document.getElementById('content');
          const grids = [...document.querySelectorAll('.combi-full-grid')].filter(g => g.offsetParent);
          return Math.max(c.scrollHeight - c.clientHeight, ...grids.map(g => g.scrollHeight - g.clientHeight));`);
        if (over <= 0) break;
        height += over + 4;
      }
      const r = await js(`const b = document.getElementById('app-shell').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height };`);
      const clip = { x: Math.max(0, r.x - MARGIN), y: Math.max(0, r.y - MARGIN), width: r.w + 2 * MARGIN, height: r.h + 2 * MARGIN, scale: 1 };
      const { data } = await s('Page.captureScreenshot', { format: 'png', clip, captureBeyondViewport: true });
      const out = join(OUT_DIR, name);
      writeFileSync(out, Buffer.from(data, 'base64'));
      if (process.platform === 'darwin') spawnSync('sips', ['-Z', String(OUT_WIDTH), out], { stdio: 'ignore' });
      console.log(`wrote docs/images/${name}`);
    };

    await s('Page.enable');
    await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 2, mobile: false });
    await s('Page.addScriptToEvaluateOnNewDocument', { source: FAKE_MIDI });
    await s('Page.navigate', { url: siteUrl });
    await sleep(2500);

    const pill = await js(`return document.getElementById('status-pill')?.textContent;`);
    if (pill !== 'Connected') throw new Error(`Expected the stand-in port to connect; status pill reads "${pill}".`);

    // Factory Bank A → Not Now → confirm A00 in the Patch Browser.
    await js(`
      document.getElementById('file-load-factory-sounds').click(); ${W}
      document.getElementById('modal-confirm-cancel').click(); ${W}
      document.querySelector('#patch-browser-body .sub-panel.active table.patch-table td').click(); ${W}
      document.getElementById('patch-browser-ok').click(); ${W} ${W}
      return 1;`);

    mkdirSync(OUT_DIR, { recursive: true });
    await js(`document.querySelector('.nav-tab[data-tab="prog"]').click(); ${W} return 1;`);
    await shot('prog-easy.png');
    await js(`document.querySelector('.nav-tab[data-tab="combi"]').click(); ${W} ${W} return 1;`);
    await shot('combi-timbres.png');

    const open = await js(`return [...document.querySelectorAll('.modal-overlay.visible, .browser-overlay.visible')].map(e => e.id);`);
    if (open.length) throw new Error(`A dialog was open during the shots: ${open.join(', ')}`);
  } finally {
    try { ws?.close(); } catch {}
    // Chrome keeps writing its profile while it shuts down: wait for it to exit.
    const exited = new Promise(r => chrome.once('exit', r));
    chrome.kill();
    await Promise.race([exited, sleep(5000)]);
    server.close();
    rmSync(siteDir, { recursive: true, force: true });
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

main().catch((e) => { console.error(`screenshots: ${e.message}`); process.exitCode = 1; });
