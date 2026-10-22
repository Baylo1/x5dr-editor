// Shared control component library: presentational DOM builders. Each takes
// (config, onChange) and returns an element; no store, setParam or SysEx here.
// Sizes derive from --control-scale, colours from theme tokens, and drag math
// reads live rendered size (getBoundingClientRect).

const SVG_NS = 'http://www.w3.org/2000/svg';

// 270° sweep, centered on 12 o'clock (-135°..+135°, clockwise from 12).
export const KNOB_SWEEP_START = -135;
export const KNOB_SWEEP_END = 135;
export const KNOB_SWEEP_TOTAL = KNOB_SWEEP_END - KNOB_SWEEP_START;

// Default knob diameter (readoutMode 'centered' and the Off/PRG override knob);
// fits an 11px readout in the hollow centre.
export const DEFAULT_KNOB_SIZE = 58;

// Hero knob (readout below) and compact knob (readout beside) sizes, from the
// VDA design; see readoutMode.
export const LARGE_KNOB_SIZE = 82;
export const SMALL_KNOB_SIZE = 38;

// Effect tab hero knob: 72px, label+value beside, value at 22px — a different
// shape from the 'below' hero (LARGE_KNOB_SIZE), so it has its own constants.
export const HERO_KNOB_SIZE = 72;
export const HERO_VALUE_FONT_SIZE = 22;

// Corner radius for chip controls (fused toggle groups, small buttons).
export const CHIP_RADIUS = 8;

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Every hardcoded pixel value in this module must be wrapped with px() so
// resizing the whole control set is a single --control-scale edit.
export function px(n) {
  return `calc(var(--control-scale) * ${n}px)`;
}

export function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

// SVG arc path from startAngle to endAngle (degrees, clockwise, 0 = 12 o'clock).
export function arcPath(cx, cy, r, startAngle, endAngle) {
  if (endAngle <= startAngle) return '';
  const [x1, y1] = polarToXY(cx, cy, r, startAngle);
  const [x2, y2] = polarToXY(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function btnBaseStyle() {
  return `font-family:inherit; font-size:${px(11)}; padding:${px(2)} ${px(6)}; ` +
    `border:1px solid var(--border-subtle); border-radius:${px(3)}; ` +
    `background:var(--bg-button-neutral); color:var(--text-secondary); cursor:pointer;`;
}

function safeSetPointerCapture(el, pointerId) {
  try { el.setPointerCapture?.(pointerId); } catch { /* not implemented in some environments (e.g. jsdom) */ }
}
function safeReleasePointerCapture(el, pointerId) {
  try { el.releasePointerCapture?.(pointerId); } catch { /* not implemented in some environments (e.g. jsdom) */ }
}

// Starts a pointer drag for any custom control (Landmine #107). Primary button
// only; ends on pointerup, pointercancel, lostpointercapture, or a move with no
// button held, so a swallowed release can't leave the control following the
// mouse. listenEl (default captureEl) receives move/up events.
export function beginPointerDrag(e, captureEl, onMove, listenEl = captureEl) {
  if (e.button !== 0 || e.ctrlKey) return false;
  // preventDefault also stops the browser moving focus, so a text field or
  // menu that was being edited would stay focused and take the next
  // keystrokes. End that edit first (Archive #223).
  const active = document.activeElement;
  if (active && active !== captureEl && /^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName)) active.blur();
  e.preventDefault();
  const { pointerId } = e;
  const move = (ev) => {
    if (ev.pointerId !== pointerId) return;
    if ((ev.buttons & 1) === 0) { end(); return; }
    onMove(ev);
  };
  const end = () => {
    listenEl.removeEventListener('pointermove', move);
    listenEl.removeEventListener('pointerup', end);
    listenEl.removeEventListener('pointercancel', end);
    captureEl.removeEventListener('lostpointercapture', end);
    safeReleasePointerCapture(captureEl, pointerId);
  };
  listenEl.addEventListener('pointermove', move);
  listenEl.addEventListener('pointerup', end);
  listenEl.addEventListener('pointercancel', end);
  captureEl.addEventListener('lostpointercapture', end);
  safeSetPointerCapture(captureEl, pointerId);
  return true;
}

// Injects one stylesheet (once) for rules inline styles can't express: hover
// reveal of steppers and hiding the native number-input spinner.
let readoutStyleInjected = false;
function ensureReadoutStyle() {
  if (readoutStyleInjected) return;
  readoutStyleInjected = true;
  const style = document.createElement('style');
  style.textContent =
    // visibility, not display: the hidden stepper keeps its space inside the
    // hover area (Landmine #73).
    '.ctrl-readout-wrap .ctrl-readout-stepper { visibility: hidden; }' +
    '.ctrl-readout-wrap:hover .ctrl-readout-stepper { visibility: visible; }' +
    '.ctrl-readout-step:hover { filter: brightness(1.3); }' +
    '.ctrl-readout-input::-webkit-outer-spin-button, ' +
    '.ctrl-readout-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } ' +
    '.ctrl-readout-input { -moz-appearance: textfield; }';
  document.head.appendChild(style);
}

// ─── Click-to-edit numeric readout ─────────────────────────────────────────
// onCommit fires on every keystroke (live, like a knob drag).
// centered: overlay inside a knob face; a drag on the number still turns the
//   knob, and only a double-click opens the editor.
// format: display string from the raw value; editing always uses the raw number.
// stepper: hover-revealed ±1 control (not offered for centered).
// Every readout opens its editor on a click — press and release without
// moving (Archive #223; before, centered readouts needed a double-click).
// drag: (non-centered; on by default) a vertical drag on the number changes
//   the value. dragPxPerUnit (number or function, read at drag start) sets the
//   scale — knobs pass their own ring scale (knobPxPerUnit) so the number and
//   the ring feel the same; default READOUT_DRAG_PX_PER_STEP px per step.
//   Centered readouts sit inside a knob: dragging the number turns the knob.
const READOUT_DRAG_PX_PER_STEP = 2;
// Movement under this counts as a click, not a drag (readouts and knob rings).
const DRAG_THRESHOLD_PX = 3;

export function buildReadout(initial, min, max, onCommit, { centered = false, format = null, fontSize = 11, fontWeight = null, textAlign = 'right', stepper = false, minWidthCh = null, step = 1, drag = true, dragPxPerUnit = null } = {}) {
  ensureReadoutStyle();
  const el = document.createElement('span');
  el.className = 'ctrl-readout';
  el.tabIndex = 0;
  // --value-color: --text-primary, or the theme accent via the Theme menu.
  const weightRule = fontWeight ? `font-weight:${fontWeight}; ` : '';
  // minWidthCh: minimum width in monospace characters, for formatted values
  // wider than a plain 0-127 number (default floor 20px).
  const minWidthRule = minWidthCh !== null ? `${minWidthCh}ch` : px(20);
  el.style.cssText = centered
    ? `font-family:var(--font-mono); font-size:${px(fontSize)}; ${weightRule}` +
      `color:var(--value-color); cursor:text; position:absolute; top:50%; left:50%; ` +
      `transform:translate(-50%, -50%); text-align:center; white-space:nowrap; pointer-events:auto;`
    : `font-family:var(--font-mono); font-size:${px(fontSize)}; ${weightRule}` +
      `color:var(--value-color); cursor:text; min-width:${minWidthRule}; text-align:${textAlign}; display:inline-block;`;
  let rawValue = initial;
  const show = (v) => { rawValue = v; el.textContent = format ? format(v) : String(v); };
  show(initial);

  const startEdit = () => {
    const input = document.createElement('input');
    input.type = 'number';
    input.min = String(min);
    input.max = String(max);
    input.value = String(rawValue);
    input.className = 'ctrl-readout-input';
    input.style.cssText = `width:${px(centered ? 32 : 40)}; font-family:inherit; font-size:inherit; ` +
      `background:var(--bg-button-neutral); color:var(--text-primary); ` +
      `border:1px solid var(--accent-line); border-radius:${px(2)}; text-align:center;` +
      (centered ? ` position:absolute; top:50%; left:50%; transform:translate(-50%, -50%);` : '');
    el.replaceWith(input);
    input.focus();
    input.select();
    // A press anywhere else ends the edit, even on a control whose pointerdown
    // calls preventDefault (knob and drag handles, stepper arrows), which would
    // otherwise leave this field focused so later typing changed this value
    // (Archive #223). Capture phase: runs before those handlers.
    const onOutsidePress = (e) => { if (e.target !== input) input.blur(); };
    document.addEventListener('pointerdown', onOutsidePress, true);
    // Snapped to the nearest step (min excluded from the grid, matching the
    // stepper buttons below — a typed value between two steps rounds to
    // whichever is closer, then clamps).
    const snap = (raw) => clamp(Math.round(raw / step) * step, min, max);
    const commitLive = () => {
      if (input.value.trim() === '') return;
      const raw = Number(input.value);
      if (Number.isNaN(raw)) return;
      onCommit(snap(raw));
    };
    const finish = () => {
      document.removeEventListener('pointerdown', onOutsidePress, true);
      const raw = Number(input.value);
      const v = snap(Number.isNaN(raw) ? min : raw);
      input.replaceWith(el);
      show(v);
      onCommit(v);
    };
    input.addEventListener('input', commitLive);
    input.addEventListener('blur', finish);
    input.addEventListener('pointerdown', (e) => e.stopPropagation());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  };
  if (centered) {
    // The pointerdown bubbles to the knob, which captures the pointer and
    // drags. A press released without moving opens the editor: watched on
    // window in the capture phase, since the knob's capture retargets the
    // pointerup (so no click reaches this element). The knob ignores moves
    // under the same threshold, so a click doesn't nudge the value.
    el.title = 'Drag to change, or click to type';
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.ctrlKey) return;
      const x0 = e.clientX;
      const y0 = e.clientY;
      let moved = false;
      const onMove = (ev) => {
        if (Math.abs(ev.clientX - x0) >= DRAG_THRESHOLD_PX || Math.abs(ev.clientY - y0) >= DRAG_THRESHOLD_PX) moved = true;
      };
      const stop = () => {
        window.removeEventListener('pointermove', onMove, true);
        window.removeEventListener('pointerup', onUp, true);
        window.removeEventListener('pointercancel', stop, true);
      };
      const onUp = () => {
        stop();
        // Defer: focusing inside a pointer handler races the browser's own
        // focus handling (Landmine #68).
        if (!moved) setTimeout(startEdit, 0);
      };
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', stop, true);
    });
  } else if (drag) {
    // Drag up/down to change; the click that ends a real drag doesn't open
    // the editor. beginPointerDrag handles the button and release rules
    // (Landmine #107); its preventDefault doesn't stop the click event.
    el.style.cursor = 'ns-resize';
    el.style.touchAction = 'none';
    el.title = 'Drag to change, or click to type';
    let dragged = false;
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      dragged = false;
      const startY = e.clientY;
      const startValue = rawValue;
      const scale = typeof dragPxPerUnit === 'function' ? dragPxPerUnit() : dragPxPerUnit;
      const pxPerUnit = scale > 0 ? scale : READOUT_DRAG_PX_PER_STEP / step;
      beginPointerDrag(e, el, (ev) => {
        const dy = startY - ev.clientY;
        if (!dragged && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
        dragged = true;
        const v = clamp(startValue + Math.round(dy / pxPerUnit / step) * step, min, max);
        if (v !== rawValue) { show(v); onCommit(v); }
      });
    });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dragged) { dragged = false; return; }
      startEdit();
    });
  } else {
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('click', (e) => { e.stopPropagation(); startEdit(); });
  }

  if (!stepper) return { el, setValue: show };

  const wrap = document.createElement('span');
  wrap.className = 'ctrl-readout-wrap';
  wrap.style.cssText = `display:inline-flex; align-items:center; gap:${px(6)};`;
  wrap.appendChild(el);

  const stepperEl = document.createElement('span');
  stepperEl.className = 'ctrl-readout-stepper';
  // Always laid out; the injected :hover rule toggles visibility only.
  stepperEl.style.cssText = `display:flex; flex-direction:column; gap:${px(2)};`;
  // Press-and-hold repeat like a native spinner; pointer capture keeps events
  // on the button if the cursor drifts.
  const STEP_REPEAT_DELAY_MS = 400;
  const STEP_REPEAT_INTERVAL_MS = 80;
  const makeStepBtn = (dir) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ctrl-readout-step';
    btn.setAttribute('aria-label', dir === 'up' ? 'Increase' : 'Decrease');
    const triangle = dir === 'up'
      ? `border-bottom:${px(4)} solid var(--accent-line);`
      : `border-top:${px(4)} solid var(--accent-line);`;
    btn.style.cssText = `width:0; height:0; padding:0; margin:0; border:0; ` +
      `border-left:${px(4)} solid transparent; border-right:${px(4)} solid transparent; ` +
      `background:none; cursor:pointer; touch-action:none; ${triangle}`;

    const doStep = () => {
      const v = clamp(rawValue + (dir === 'up' ? step : -step), min, max);
      show(v);
      onCommit(v);
    };
    // Hold-to-repeat ends on any sign the press is over, not just pointerup — a
    // swallowed release (context menu, app switch) must not keep sending
    // Parameter Changes (Landmine #107's shape; audit B2).
    let repeatTimer = null;
    let repeatInterval = null;
    let activePointerId = null;
    const endRepeat = () => {
      if (repeatTimer) { clearTimeout(repeatTimer); repeatTimer = null; }
      if (repeatInterval) { clearInterval(repeatInterval); repeatInterval = null; }
      window.removeEventListener('blur', endRepeat);
      if (activePointerId !== null) {
        const id = activePointerId;
        activePointerId = null;
        safeReleasePointerCapture(btn, id);
      }
    };
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button !== 0 || e.ctrlKey) return;
      e.preventDefault();
      endRepeat();
      activePointerId = e.pointerId;
      safeSetPointerCapture(btn, e.pointerId);
      window.addEventListener('blur', endRepeat);
      doStep();
      repeatTimer = setTimeout(() => {
        repeatInterval = setInterval(doStep, STEP_REPEAT_INTERVAL_MS);
      }, STEP_REPEAT_DELAY_MS);
    });
    btn.addEventListener('pointermove', (e) => {
      if (activePointerId !== null && (e.buttons & 1) === 0) endRepeat();
    });
    btn.addEventListener('pointerup', endRepeat);
    btn.addEventListener('pointercancel', endRepeat);
    btn.addEventListener('lostpointercapture', endRepeat);
    return btn;
  };
  stepperEl.appendChild(makeStepBtn('up'));
  stepperEl.appendChild(makeStepBtn('down'));
  wrap.appendChild(stepperEl);

  return { el: wrap, setValue: show };
}

function numericField(val, min, max, onCommit) {
  const el = document.createElement('input');
  el.type = 'number';
  el.className = 'ctrl-range-e-field';
  el.min = String(min);
  el.max = String(max);
  el.value = String(val);
  el.style.cssText = `width:${px(40)}; font-family:var(--font-mono); font-size:${px(11)};` +
    `background:var(--bg-button-neutral); color:var(--text-primary); border:1px solid var(--border-subtle); ` +
    `border-radius:${px(2)}; padding:${px(1)} ${px(4)};`;
  el.addEventListener('change', () => {
    let v = parseInt(el.value, 10);
    if (Number.isNaN(v)) v = min;
    onCommit(clamp(v, min, max));
  });
  return { el, setValue: (v) => { el.value = String(v); } };
}

// ─── Shared knob base (variants A/B) ────────────────────────────────────────
// zeroAngle draws a reference tick at the zero position so a knob at 0 doesn't
// look inactive. The tick sits in the ring band (r36-44), so any non-zero fill
// covers it.
const ZERO_TICK_OUTER_R = 44;
const ZERO_TICK_LENGTH = 8;
const ZERO_TICK_STROKE = 3;
function buildKnobBase(size, zeroAngle = null) {
  const wrap = document.createElement('span');
  wrap.className = 'ctrl-knob';
  wrap.style.cssText = `display:inline-block; width:${px(size)}; height:${px(size)}; ` +
    `position:relative; touch-action:none; cursor:ns-resize;`;
  const svg = svgEl('svg', { viewBox: '0 0 100 100', width: '100%', height: '100%' });
  const track = svgEl('path', {
    fill: 'none', stroke: 'var(--track-empty)', 'stroke-width': 8, 'stroke-linecap': 'round',
  });
  const valueArc = svgEl('path', {
    fill: 'none', stroke: 'var(--accent-line)', 'stroke-width': 8, 'stroke-linecap': 'round',
  });
  track.setAttribute('d', arcPath(50, 50, 40, KNOB_SWEEP_START, KNOB_SWEEP_END));
  svg.appendChild(track);
  svg.appendChild(valueArc);
  if (zeroAngle !== null) {
    const [x1, y1] = polarToXY(50, 50, ZERO_TICK_OUTER_R, zeroAngle);
    const [x2, y2] = polarToXY(50, 50, ZERO_TICK_OUTER_R - ZERO_TICK_LENGTH, zeroAngle);
    // Butt (square) cap — a round cap's half-stroke-width overhang would
    // push the tick visibly past both the ring's outer and inner edges,
    // since it's already clamped to exactly the ring's own thickness.
    const tick = svgEl('line', {
      x1, y1, x2, y2,
      stroke: 'var(--accent-line)', 'stroke-width': ZERO_TICK_STROKE,
      'stroke-linecap': 'butt',
    });
    svg.appendChild(tick);
  }
  wrap.appendChild(svg);
  return { wrap, svg, track, valueArc };
}

// Vertical-drag-to-change: dragRange is a multiple of the knob's own live
// rendered height (read via getBoundingClientRect()), never a fixed constant.
// Moves under DRAG_THRESHOLD_PX are ignored, so a click (e.g. on a centered
// number, to type) doesn't nudge the value.
const KNOB_DRAG_RANGE_HEIGHTS = 4;
function attachKnobDrag(wrap, getStartValue, onDrag) {
  wrap.addEventListener('pointerdown', (e) => {
    const rect = wrap.getBoundingClientRect();
    const dragRange = (rect.height || 1) * KNOB_DRAG_RANGE_HEIGHTS;
    const startY = e.clientY;
    const startValue = getStartValue();
    let dragging = false;
    beginPointerDrag(e, wrap, (ev) => {
      if (!dragging && Math.abs(startY - ev.clientY) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      const frac = (startY - ev.clientY) / dragRange;
      onDrag(startValue, frac);
    });
  });
}

// Pixels per unit of value for a knob ring's drag — what a readout beside or
// below the knob uses, so dragging the number matches dragging the ring.
function knobPxPerUnit(knobWrap, min, max) {
  return ((knobWrap.getBoundingClientRect().height || 1) * KNOB_DRAG_RANGE_HEIGHTS) / (max - min || 1);
}

// Default diameter per readoutMode; config.size overrides.
function sizeForReadoutMode(mode) {
  if (mode === 'below') return LARGE_KNOB_SIZE;
  if (mode === 'beside') return SMALL_KNOB_SIZE;
  return DEFAULT_KNOB_SIZE;
}

// Outer container per readoutMode: 'centered' puts the readout in the knob face;
// 'below'/'beside' place an external readout.
function buildKnobContainer(knobWrap, readoutMode, readoutApi, label, besideGap = 10) {
  if (readoutMode === 'below') {
    const outer = document.createElement('span');
    outer.className = 'ctrl-knob-group ctrl-knob-below';
    // gap 0: the ring's open bottom already leaves room; the readout's
    // negative margin-top pulls it up.
    outer.style.cssText = `display:inline-flex; flex-direction:column; align-items:center; gap:0;`;
    outer.appendChild(knobWrap);
    if (readoutApi) {
      // marginLeft 14 centres the number under the ring: the wrap includes the
      // reserved stepper (7px off-centre), and align-items:center moves content
      // by only half an asymmetric margin (Landmine #83).
      readoutApi.el.style.marginTop = px(-8);
      readoutApi.el.style.marginLeft = px(14);
      outer.appendChild(readoutApi.el);
    }
    return outer;
  }
  if (readoutMode === 'beside') {
    const outer = document.createElement('span');
    outer.className = 'ctrl-knob-group ctrl-knob-beside';
    outer.style.cssText = `display:inline-flex; align-items:center; gap:${px(besideGap)};`;
    outer.appendChild(knobWrap);
    const textCol = document.createElement('span');
    textCol.className = 'ctrl-knob-beside-text';
    textCol.style.cssText = 'display:inline-flex; flex-direction:column;';
    if (label) {
      const lbl = document.createElement('span');
      lbl.className = 'ctrl-knob-beside-label';
      lbl.style.cssText = `font-size:${px(10)}; color:var(--text-secondary);`;
      lbl.textContent = label;
      textCol.appendChild(lbl);
    }
    if (readoutApi) textCol.appendChild(readoutApi.el);
    outer.appendChild(textCol);
    return outer;
  }
  const container = document.createElement('span');
  container.className = 'ctrl-knob-group';
  container.appendChild(knobWrap);
  return container;
}

// ─── A — Knob, unidirectional (0 → max) ────────────────────────────────────
// readoutMode: 'centered' (default), 'below' (hero) or 'beside' (compact; uses
// `label`). `format` renders the displayed value.
export function knobUnidirectional(config, onChange) {
  const {
    min = 0, max = 99, value = 0, readout = true,
    readoutMode = 'centered', label = null, format = null, valueFontSize = null,
    // stepper/besideGap: opt-outs for dense contexts (Combi Timbres tab) —
    // default to prior behavior exactly (stepper always on outside
    // 'centered' mode, 10px beside-gap) so no existing caller changes.
    stepper = readoutMode !== 'centered', besideGap = 10, step = 1,
  } = config;
  const size = config.size ?? sizeForReadoutMode(readoutMode);
  const snap = (v) => clamp(Math.round(v / step) * step, min, max);
  let current = snap(value);
  const { wrap, valueArc } = buildKnobBase(size, KNOB_SWEEP_START);
  wrap.classList.add('ctrl-knob-a');

  let readoutApi = null;
  const render = () => {
    const frac = (current - min) / (max - min || 1);
    const angle = KNOB_SWEEP_START + frac * KNOB_SWEEP_TOTAL;
    valueArc.setAttribute('d', arcPath(50, 50, 40, KNOB_SWEEP_START, angle));
    readoutApi?.setValue(current);
  };
  render();

  attachKnobDrag(wrap, () => current, (startValue, frac) => {
    current = snap(startValue + frac * (max - min));
    render();
    onChange(current);
  });

  if (readout) {
    const centered = readoutMode === 'centered';
    readoutApi = buildReadout(current, min, max, (v) => { current = v; render(); onChange(current); }, {
      centered, format, fontSize: valueFontSize ?? (readoutMode === 'below' ? 19 : 11), step,
      // Hero readouts ('below', or 'beside' with valueFontSize) are bold.
      fontWeight: (readoutMode === 'below' || valueFontSize) ? 600 : null,
      textAlign: readoutMode === 'beside' ? 'left' : 'center',
      stepper, dragPxPerUnit: () => knobPxPerUnit(wrap, min, max),
    });
    if (centered) wrap.appendChild(readoutApi.el);
  }

  const container = buildKnobContainer(wrap, readoutMode, readoutApi, label, besideGap);
  container._readout = readoutApi;
  container._knob = wrap;
  container._setValue = (v) => { current = snap(v); render(); };
  container._getValue = () => current;
  return container;
}

// ─── B — Knob, bidirectional (centered) ────────────────────────────────────
// Same readoutMode/label/format extension as variant A — see its comment.
export function knobBidirectional(config, onChange) {
  const {
    min = -99, max = 99, value = 0, readout = true,
    readoutMode = 'centered', label = null, format = null, valueFontSize = null,
    stepper = readoutMode !== 'centered', besideGap = 10,
  } = config;
  const size = config.size ?? sizeForReadoutMode(readoutMode);
  let current = clamp(value, min, max);
  // Zero tick at the sweep's midpoint (12 o'clock) — the center reference
  // this variant's fill arc always starts from, regardless of min/max.
  const { wrap, valueArc } = buildKnobBase(size, KNOB_SWEEP_START + KNOB_SWEEP_TOTAL / 2);
  wrap.classList.add('ctrl-knob-b');

  const angleFor = (v) => {
    const frac = (v - min) / (max - min || 1);
    return KNOB_SWEEP_START + frac * KNOB_SWEEP_TOTAL;
  };
  let readoutApi = null;
  const render = () => {
    const zeroAngle = angleFor(clamp(0, min, max));
    const curAngle = angleFor(current);
    const from = Math.min(zeroAngle, curAngle);
    const to = Math.max(zeroAngle, curAngle);
    valueArc.setAttribute('d', arcPath(50, 50, 40, from, to));
    readoutApi?.setValue(current);
  };
  render();

  attachKnobDrag(wrap, () => current, (startValue, frac) => {
    current = clamp(Math.round(startValue + frac * (max - min)), min, max);
    render();
    onChange(current);
  });

  if (readout) {
    const centered = readoutMode === 'centered';
    readoutApi = buildReadout(current, min, max, (v) => { current = v; render(); onChange(current); }, {
      centered, format, fontSize: valueFontSize ?? (readoutMode === 'below' ? 19 : 11),
      // Hero readouts ('below', or 'beside' with valueFontSize) are bold.
      fontWeight: (readoutMode === 'below' || valueFontSize) ? 600 : null,
      textAlign: readoutMode === 'beside' ? 'left' : 'center',
      stepper, dragPxPerUnit: () => knobPxPerUnit(wrap, min, max),
    });
    if (centered) wrap.appendChild(readoutApi.el);
  }

  const container = buildKnobContainer(wrap, readoutMode, readoutApi, label, besideGap);
  container._readout = readoutApi;
  container._knob = wrap;
  container._setValue = (v) => { current = clamp(v, min, max); render(); };
  container._getValue = () => current;
  return container;
}

// ─── Shared fused segmented-strip toggle group (D and G) ───────────────────
// One continuous strip; the active segment is marked by an inset ring.
function buildFusedToggleGroup(items, value, onChange, { fontSize = 12, paddingY = 7, paddingX = 13, inactiveColor = 'var(--text-secondary)' } = {}) {
  let current = value;
  const wrap = document.createElement('span');
  wrap.style.cssText = `display:inline-flex; border:1px solid var(--border-subtle); ` +
    `border-radius:${px(CHIP_RADIUS)}; overflow:hidden;`;

  const buttons = items.map((item, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    // Optional per-item icon HTML (VDF Wave Form); otherwise the text label.
    if (item.icon) {
      btn.innerHTML = item.icon;
      btn.title = item.label;
    } else {
      // Invisible always-bold ghost span reserves the width, so toggling the
      // visible label's weight doesn't resize the strip (Landmine #106).
      btn.style.position = 'relative';
      const ghost = document.createElement('span');
      ghost.textContent = item.label;
      ghost.style.cssText = 'visibility:hidden; display:block; white-space:nowrap; font-weight:600;';
      // Stashed on the button so the returned `buttons` stay plain elements.
      btn._fusedLabelEl = document.createElement('span');
      btn._fusedLabelEl.textContent = item.label;
      btn._fusedLabelEl.style.cssText = 'position:absolute; inset:0; display:flex; align-items:center; justify-content:center; white-space:nowrap;';
      btn.appendChild(ghost);
      btn.appendChild(btn._fusedLabelEl);
    }
    // Outer corners get the strip's radius so the active ring follows it
    // (Landmine #84); a single-item group rounds both sides.
    const endRadius = items.length === 1 ? `${px(CHIP_RADIUS)}`
      : i === 0 ? `${px(CHIP_RADIUS)} 0 0 ${px(CHIP_RADIUS)}`
      : i === items.length - 1 ? `0 ${px(CHIP_RADIUS)} ${px(CHIP_RADIUS)} 0`
      : '0';
    btn.style.cssText += `font-family:inherit; font-size:${px(fontSize)}; ` +
      `padding:${px(paddingY)} ${px(paddingX)}; border:none; border-radius:${endRadius}; cursor:pointer; ` +
      (item.icon ? 'display:flex; align-items:center; justify-content:center;' : '');
    btn.addEventListener('click', () => { current = item.value; update(); onChange(current); });
    wrap.appendChild(btn);
    return btn;
  });

  function update() {
    buttons.forEach((btn, i) => {
      const active = items[i].value === current;
      // Active: transparent fill, accent inset ring (fixed colour, like a knob
      // arc) and --value-color text (follows the Theme menu's value colour).
      btn.style.background = 'transparent';
      btn.style.boxShadow = active ? 'inset 0 0 0 1.5px var(--accent-line)' : 'none';
      btn.classList.toggle('active', active);
      const target = btn._fusedLabelEl ?? btn;
      target.style.color = active ? 'var(--value-color)' : inactiveColor;
      target.style.fontWeight = active ? '600' : '400';
    });
  }
  update();

  return {
    wrap, buttons,
    setValue: (v) => { current = v; update(); },
    getValue: () => current,
  };
}

// ─── D — Three-way toggle (off / + / −) ────────────────────────────────────
export function threeWayToggle(config, onChange) {
  const { value = 0, values = [-1, 0, 1], labels = ['−', 'off', '+'] } = config;
  const items = values.map((v, i) => ({ value: v, label: labels[i] }));
  // Size matched to toggleButtonGroup; paddingX 18 so the EG Time Mod toggles
  // fill their row (VDA and VDF).
  const { wrap, buttons, setValue, getValue } = buildFusedToggleGroup(items, value, onChange, {
    fontSize: 10, paddingY: 6, paddingX: 18,
  });
  wrap.className = 'ctrl-toggle3';
  buttons.forEach((btn) => btn.classList.add('ctrl-toggle3-btn'));
  wrap._setValue = setValue;
  wrap._getValue = getValue;
  return wrap;
}

// ─── E — Dual-handle range slider, clamped (cannot cross) ─────────────────
// fieldStyle: 'plain' (bordered number input) or 'readout' (buildReadout with
// stepper, like knob values). gap: space between fields and track — the handle
// overhangs the track by 6px, so 'readout' callers should pass more. format
// (readout only): displayed value; editing uses the raw number.
export function dualHandleRangeSlider(config, onChange) {
  const { min = 0, max = 99, low = min, high = max, trackLength = 140, gap = 6, fieldStyle = 'plain', format = null } = config;
  let lo = clamp(low, min, max);
  let hi = clamp(high, min, max);
  if (lo > hi) [lo, hi] = [hi, lo];

  const wrap = document.createElement('span');
  wrap.className = 'ctrl-range-e';
  wrap.style.cssText = `display:inline-flex; align-items:center; gap:${px(gap)};`;

  const track = document.createElement('span');
  track.className = 'ctrl-range-e-track';
  track.style.cssText = `position:relative; display:inline-block; width:${px(trackLength)}; ` +
    `height:${px(6)}; background:var(--track-empty); border-radius:${px(3)};`;

  const fill = document.createElement('span');
  fill.className = 'ctrl-range-e-fill';
  fill.style.cssText = `position:absolute; top:0; bottom:0; background:var(--accent-line); border-radius:${px(3)};`;
  track.appendChild(fill);

  function makeHandle(cls) {
    const h = document.createElement('span');
    h.className = `ctrl-range-e-handle ${cls}`;
    h.style.cssText = `position:absolute; top:50%; width:${px(12)}; height:${px(12)}; ` +
      `margin-left:${px(-6)}; margin-top:${px(-6)}; background:var(--accent-fill); ` +
      `border-radius:50%; cursor:ew-resize; touch-action:none;`;
    track.appendChild(h);
    return h;
  }
  const handleLo = makeHandle('ctrl-range-e-handle-lo');
  const handleHi = makeHandle('ctrl-range-e-handle-hi');

  // With a format fn, reserve the widest formatted value across min..max so
  // the layout doesn't reflow as values change (e.g. "C#-1").
  const formatMinWidthCh = format
    ? Math.max(...Array.from({ length: max - min + 1 }, (_, i) => String(format(min + i)).length))
    : null;
  const numLo = fieldStyle === 'readout'
    ? buildReadout(lo, min, max, (v) => setLo(v), { stepper: true, fontSize: 11, textAlign: 'right', format, minWidthCh: formatMinWidthCh })
    : numericField(lo, min, max, (v) => setLo(v));
  const numHi = fieldStyle === 'readout'
    ? buildReadout(hi, min, max, (v) => setHi(v), { stepper: true, fontSize: 11, textAlign: 'right', format, minWidthCh: formatMinWidthCh })
    : numericField(hi, min, max, (v) => setHi(v));

  function render() {
    const fracLo = (lo - min) / (max - min || 1);
    const fracHi = (hi - min) / (max - min || 1);
    handleLo.style.left = `${fracLo * 100}%`;
    handleHi.style.left = `${fracHi * 100}%`;
    fill.style.left = `${fracLo * 100}%`;
    fill.style.right = `${100 - fracHi * 100}%`;
    numLo.setValue(lo);
    numHi.setValue(hi);
  }

  // Clamped: low can never pass high and vice versa — closest approach is
  // both handles at the same value.
  function setLo(v) { lo = clamp(Math.min(v, hi), min, max); render(); onChange({ low: lo, high: hi }); }
  function setHi(v) { hi = clamp(Math.max(v, lo), min, max); render(); onChange({ low: lo, high: hi }); }

  function attachHandleDrag(handle, setter) {
    handle.addEventListener('pointerdown', (e) => {
      beginPointerDrag(e, handle, (ev) => {
        const rect = track.getBoundingClientRect();
        const frac = clamp((ev.clientX - rect.left) / (rect.width || 1), 0, 1);
        setter(Math.round(min + frac * (max - min)));
      });
    });
  }
  attachHandleDrag(handleLo, setLo);
  attachHandleDrag(handleHi, setHi);

  render();
  wrap.appendChild(numLo.el);
  wrap.appendChild(track);
  wrap.appendChild(numHi.el);
  wrap._setValue = (l, h) => { lo = clamp(Math.min(l, h), min, max); hi = clamp(Math.max(l, h), min, max); render(); };
  wrap._getValue = () => ({ low: lo, high: hi });
  return wrap;
}

// ─── I — Vertical fader, zero-centered ─────────────────────────────────────
// Used by Global's User Scale. Fill runs from zero to the handle; a dashed zero
// line is always shown; the readout is always visible (12 in a row must be
// legible at rest).
export function verticalFaderCentered(config, onChange) {
  // trackColor: resting track colour (User Scale tints sharps/flats). Passed as
  // config because this component's inline styles would beat any CSS class.
  const { min = -99, max = 99, value = 0, trackHeight = 90, format = null, trackColor = 'var(--track-empty)' } = config;
  let current = clamp(value, min, max);

  const wrap = document.createElement('span');
  wrap.className = 'ctrl-vfader';
  wrap.style.cssText = `display:inline-flex; flex-direction:column; align-items:center; gap:${px(6)};`;

  const track = document.createElement('span');
  track.className = 'ctrl-vfader-track';
  track.style.cssText = `position:relative; display:inline-block; width:${px(6)}; ` +
    `height:${px(trackHeight)}; background:${trackColor}; border-radius:${px(3)};`;

  // Zero line — same dashed style as the EG widget's centre line.
  const zeroFrac = 1 - (clamp(0, min, max) - min) / (max - min || 1);
  const zeroLine = document.createElement('span');
  zeroLine.className = 'ctrl-vfader-zeroline';
  zeroLine.style.cssText = `position:absolute; left:${px(-3)}; right:${px(-3)}; top:${zeroFrac * 100}%; ` +
    `border-top:1px dashed var(--text-secondary); opacity:0.4; pointer-events:none;`;
  track.appendChild(zeroLine);

  const fill = document.createElement('span');
  fill.className = 'ctrl-vfader-fill';
  fill.style.cssText = `position:absolute; left:0; right:0; background:var(--accent-line); border-radius:${px(3)};`;
  track.appendChild(fill);

  const handle = document.createElement('span');
  handle.className = 'ctrl-vfader-handle';
  handle.style.cssText = `position:absolute; left:50%; width:${px(14)}; height:${px(14)}; ` +
    `margin-left:${px(-7)}; margin-top:${px(-7)}; background:var(--accent-fill); ` +
    `border-radius:50%; cursor:ns-resize; touch-action:none;`;
  track.appendChild(handle);

  const readoutApi = buildReadout(current, min, max, (v) => setValue(v), {
    stepper: true, fontSize: 11, textAlign: 'center', format,
  });
  // Centre the number, not the number+stepper wrap (see buildKnobContainer,
  // Landmine #83).
  readoutApi.el.style.marginLeft = px(14);

  function render() {
    const frac = 1 - (current - min) / (max - min || 1); // inverted: up is higher value
    handle.style.top = `${frac * 100}%`;
    const curFrac = frac * 100;
    const zFrac = zeroFrac * 100;
    fill.style.top = `${Math.min(curFrac, zFrac)}%`;
    fill.style.bottom = `${100 - Math.max(curFrac, zFrac)}%`;
    readoutApi.setValue(current);
  }

  function setValue(v) { current = clamp(v, min, max); render(); onChange(current); }

  handle.addEventListener('pointerdown', (e) => {
    beginPointerDrag(e, handle, (ev) => {
      const rect = track.getBoundingClientRect();
      const frac = 1 - clamp((ev.clientY - rect.top) / (rect.height || 1), 0, 1);
      setValue(Math.round(min + frac * (max - min)));
    });
  });

  render();
  wrap.appendChild(track);
  wrap.appendChild(readoutApi.el);
  wrap._setValue = (v) => { current = clamp(v, min, max); render(); };
  wrap._getValue = () => current;
  return wrap;
}

// ─── F — EG curve widget ────────────────────────────────────────────────────
// Fixed pixels per time unit, so a time value has the same width on any stage
// and patch. Flat segments are only the Sustain plateau and the tail after the
// last stage.
const EG_DEFAULT_PX_PER_TIME = 1.2;
const EG_DEFAULT_SUSTAIN_FRAC = 0.2;
// Stroke width for the main and ghost traces (distinguished only by opacity).
const EG_STROKE_WIDTH = 2;
// Marker radius scaled down with EG_STROKE_WIDTH by the same ratio (4/3,
// same as the old stroke-width:marker-radius pairing) rather than picked
// independently, so the two keep reading as one consistent weight.
const EG_MARKER_RADIUS = 3;
// Reference line (floor mode's level 0, centre mode's zero) — one style
// everywhere, matched by the Parametric EQ curve's 0 line in index.html.
const EG_REF_LINE_WIDTH = 1.25;
const EG_REF_LINE_OPACITY = 0.4;
const EG_REF_LINE_DASH = '4.5 4';
// Invisible hit target, 3x the visible marker, for easier grabbing.
const EG_MARKER_HIT_RADIUS = 9;
// Padding between the curve and its window border (matches the mockups).
const EG_WINDOW_PAD_X = 14;
// Equal to EG_WINDOW_PAD_X so extremes sit equally close to every edge.
const EG_WINDOW_PAD_Y = EG_WINDOW_PAD_X;
const EG_WINDOW_RADIUS = 8;
// Default curve height (window = height + 2 × EG_WINDOW_PAD_Y).
const EG_DEFAULT_HEIGHT = 151;

export function egGeometry(config) {
  const {
    stages, timeMax = 99, pxPerTimeUnit = EG_DEFAULT_PX_PER_TIME,
    sustainAfter = null, sustainWidthFrac = EG_DEFAULT_SUSTAIN_FRAC,
  } = config;

  const nonSustainWorstCase = stages.length * timeMax * pxPerTimeUnit;
  const totalWidth = sustainAfter
    ? nonSustainWorstCase / (1 - sustainWidthFrac)
    : nonSustainWorstCase;
  const sustainWidth = totalWidth - nonSustainWorstCase;

  const points = [];
  let x = 0;
  for (const s of stages) {
    x += s.time * pxPerTimeUnit;
    points.push({ key: s.key, x, level: s.level });
    if (s.key === sustainAfter) {
      x += sustainWidth;
      points.push({ key: `${s.key}__sustain-end`, x, level: s.level, isSustainEnd: true });
    }
  }
  return { totalWidth, sustainWidth, points };
}

export function egMapY(level, mode, levelMin, levelMax, height) {
  if (mode === 'center') {
    const half = height / 2;
    const span = Math.max(Math.abs(levelMin), Math.abs(levelMax)) || 1;
    return half - (level / span) * half;
  }
  return height - ((level - levelMin) / (levelMax - levelMin || 1)) * height;
}

function buildEgPathD(startLevel, points, mode, levelMin, levelMax, height, totalWidth) {
  const mapY = (lv) => egMapY(lv, mode, levelMin, levelMax, height);
  let d = `M 0 ${mapY(startLevel)}`;
  for (const p of points) d += ` L ${p.x} ${mapY(p.level)}`;
  const lastX = points.length ? points[points.length - 1].x : 0;
  const lastLevel = points.length ? points[points.length - 1].level : startLevel;
  if (lastX < totalWidth) d += ` L ${totalWidth} ${mapY(lastLevel)}`;
  return d;
}

const EG_AXIS_LOCK_THRESHOLD_PX = 3;

/**
 * Shift-drag axis lock, shared by the EG curves and the Parametric EQ curve:
 * with Shift held, the drag locks to the axis moved first ('x' or 'y') once
 * the pointer is EG_AXIS_LOCK_THRESHOLD_PX from where it started; releasing
 * Shift unlocks (null). Call on every move with the previous result.
 */
export function dragAxisLock(axis, shiftKey, dxPx, dyPx) {
  if (!shiftKey) return null;
  if (axis) return axis;
  if (Math.max(Math.abs(dxPx), Math.abs(dyPx)) < EG_AXIS_LOCK_THRESHOLD_PX) return null;
  return Math.abs(dxPx) >= Math.abs(dyPx) ? 'x' : 'y';
}

export function egCurveWidget(config, onChange) {
  const {
    mode = 'floor', levelMin = 0, levelMax = 99,
    height = EG_DEFAULT_HEIGHT, width = null, ghost = null,
  } = config;
  // startLevel is mutable: OSC's Pitch EG edits it (see _setStartLevel).
  let { startLevel = 0 } = config;

  const geo = egGeometry(config);

  // Fixed pixel size, not responsive: callers that must match a sibling row
  // pass an explicit width computed from the same CSS tokens (Landmine #74).
  // Omitting width uses the geometry's worst-case width. The window padding is
  // added around the curve, never taken from it.
  const naturalWidth = geo.totalWidth + 2 * EG_WINDOW_PAD_X;
  const windowWidth = width ?? naturalWidth;
  const windowHeight = height + 2 * EG_WINDOW_PAD_Y;

  const windowEl = document.createElement('span');
  windowEl.className = 'ctrl-eg-window';
  // Drag math reads the live rendered size, so it holds for any width.
  windowEl.style.cssText = `display:block; box-sizing:border-box; width:${px(windowWidth)}; ` +
    `height:${px(windowHeight)}; background:var(--bg-page); ` +
    `border-radius:${px(EG_WINDOW_RADIUS)}; padding:${px(EG_WINDOW_PAD_Y)} ${px(EG_WINDOW_PAD_X)};`;

  const wrap = document.createElement('span');
  wrap.className = 'ctrl-eg';
  wrap.style.cssText = 'display:block; width:100%; height:100%;';
  windowEl.appendChild(wrap);

  // preserveAspectRatio="none": x and y scale independently. With the default
  // 'meet', a caller-set width shrank strokes and letterboxed the curve. y is
  // always 1:1; x may not be (scaleX), so strokes use non-scaling-stroke and
  // markers compensate their x-radius. overflow="visible" lets strokes and
  // markers at the data extremes draw into the window padding instead of being
  // clipped (Landmine #81).
  const svg = svgEl('svg', {
    viewBox: `0 0 ${geo.totalWidth} ${height}`, width: '100%', height: '100%',
    preserveAspectRatio: 'none', overflow: 'visible',
  });
  wrap.appendChild(svg);

  // CSS px per user unit on x (≠ 1 only when a caller sets width); used to keep
  // markers round.
  const scaleX = (windowWidth - 2 * EG_WINDOW_PAD_X) / geo.totalWidth;

  // Reference line — floor mode's baseline (level 0) and center mode's zero
  // line share one treatment (see EG_REF_LINE_* above). Drawn first so the
  // trace/markers/ghost render on top of it.
  const refLineLevel = mode === 'center' ? 0 : levelMin;
  const refLineY = egMapY(refLineLevel, mode, levelMin, levelMax, height);
  const refLine = svgEl('line', {
    class: 'ctrl-eg-ref-line', x1: 0, y1: refLineY, x2: geo.totalWidth, y2: refLineY,
    stroke: 'var(--text-secondary)', 'stroke-width': EG_REF_LINE_WIDTH,
    'stroke-dasharray': EG_REF_LINE_DASH, opacity: EG_REF_LINE_OPACITY,
    'vector-effect': 'non-scaling-stroke',
  });
  svg.appendChild(refLine);

  // color/opacity: overrides for the Easy tab's grey, non-editable reference curve.
  if (ghost) {
    const ghostGeo = egGeometry({ ...config, stages: ghost.stages });
    const ghostPath = svgEl('path', {
      class: 'ctrl-eg-ghost', fill: 'none', stroke: ghost.color ?? 'var(--accent-line)',
      'stroke-width': EG_STROKE_WIDTH, opacity: ghost.opacity ?? 0.35, 'vector-effect': 'non-scaling-stroke',
      d: buildEgPathD(ghost.startLevel ?? startLevel, ghostGeo.points, mode, levelMin, levelMax, height, geo.totalWidth),
    });
    svg.appendChild(ghostPath);
  }

  const mainPath = svgEl('path', {
    class: 'ctrl-eg-trace', fill: 'none', stroke: 'var(--accent-line)', 'stroke-width': EG_STROKE_WIDTH,
    'vector-effect': 'non-scaling-stroke',
  });
  svg.appendChild(mainPath);

  // Ellipses with rx = r / scaleX render as true circles (y is always 1:1).
  const markers = geo.points
    .filter((p) => !p.isSustainEnd)
    .map((p) => {
      const c = svgEl('ellipse', {
        class: 'ctrl-eg-marker', 'data-stage': p.key,
        rx: EG_MARKER_RADIUS / scaleX, ry: EG_MARKER_RADIUS, fill: 'var(--value-color)',
      });
      svg.appendChild(c);
      // Transparent, larger ellipse stacked on top — carries the actual
      // pointerdown/drag handling so the grab target is bigger than the
      // visible dot without changing its drawn size.
      const hit = svgEl('ellipse', {
        class: 'ctrl-eg-marker-hit', 'data-stage': p.key,
        rx: EG_MARKER_HIT_RADIUS / scaleX, ry: EG_MARKER_HIT_RADIUS, fill: 'transparent',
      });
      svg.appendChild(hit);
      return { key: p.key, el: c, hitEl: hit };
    });

  // Start Level handle (config.startLevelEditable; OSC Pitch EG only): at x=0,
  // vertical drag only, not part of geo.points since it has no time.
  let startMarker = null;
  if (config.startLevelEditable) {
    const c = svgEl('ellipse', {
      class: 'ctrl-eg-marker', 'data-stage': 'start',
      rx: EG_MARKER_RADIUS / scaleX, ry: EG_MARKER_RADIUS, fill: 'var(--value-color)',
    });
    svg.appendChild(c);
    const hit = svgEl('ellipse', {
      class: 'ctrl-eg-marker-hit', 'data-stage': 'start',
      rx: EG_MARKER_HIT_RADIUS / scaleX, ry: EG_MARKER_HIT_RADIUS, fill: 'transparent',
    });
    svg.appendChild(hit);
    startMarker = { el: c, hitEl: hit };
  }

  let stages = config.stages.map((s) => ({ ...s }));

  function render() {
    const g = egGeometry({ ...config, stages });
    mainPath.setAttribute('d', buildEgPathD(startLevel, g.points, mode, levelMin, levelMax, height, g.totalWidth));
    for (const m of markers) {
      const p = g.points.find((pt) => pt.key === m.key);
      if (!p) continue;
      const cy = egMapY(p.level, mode, levelMin, levelMax, height);
      m.el.setAttribute('cx', p.x);
      m.el.setAttribute('cy', cy);
      m.hitEl.setAttribute('cx', p.x);
      m.hitEl.setAttribute('cy', cy);
    }
    if (startMarker) {
      const cy = egMapY(startLevel, mode, levelMin, levelMax, height);
      startMarker.el.setAttribute('cx', 0);
      startMarker.el.setAttribute('cy', cy);
      startMarker.hitEl.setAttribute('cx', 0);
      startMarker.hitEl.setAttribute('cy', cy);
    }
  }
  render();

  // Shared by both the stage markers' level-drag branch and the Start Level
  // handle below — vertical pointer delta (CSS px) -> level delta, in
  // whichever of the two axis conventions `mode` uses.
  function dLevelFromPx(dLevelPx) {
    return mode === 'center'
      ? -(dLevelPx / (height / 2)) * (Math.max(Math.abs(levelMin), levelMax) || 1)
      : -(dLevelPx / height) * (levelMax - levelMin);
  }

  markers.forEach(({ key, el, hitEl }) => {
    const stageIndex = stages.findIndex((s) => s.key === key);
    if (stageIndex === -1) return;
    const stageConfig = config.stages[stageIndex];
    hitEl.style.cursor = 'grab';
    hitEl.addEventListener('pointerdown', (e) => {
      const rect = svg.getBoundingClientRect();
      const pxPerUnitX = (rect.width || 1) / geo.totalWidth;
      const pxPerUnitY = (rect.height || 1) / height;
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startTime = stages[stageIndex].time;
      const startLevelVal = stages[stageIndex].level;
      const timeMax = config.timeMax ?? 99;
      // Shift locks the drag to the axis moved first (x = time, y = level);
      // the other value goes back to where it started. Releasing Shift
      // unlocks (Archive #223).
      let axis = null;
      const onMove = (ev) => {
        const dxPx = ev.clientX - startClientX;
        const dyPx = ev.clientY - startClientY;
        axis = dragAxisLock(axis, ev.shiftKey, dxPx, dyPx);
        if (stageConfig.timeEditable !== false) {
          const dt = axis === 'y' ? 0 : dxPx / pxPerUnitX / (config.pxPerTimeUnit ?? EG_DEFAULT_PX_PER_TIME);
          stages[stageIndex].time = clamp(Math.round(startTime + dt), 0, timeMax);
        }
        if (stageConfig.levelEditable !== false) {
          const dLevelPx = axis === 'x' ? 0 : dyPx / pxPerUnitY;
          stages[stageIndex].level = clamp(Math.round(startLevelVal + dLevelFromPx(dLevelPx)), levelMin, levelMax);
        }
        render();
        onChange(key, { time: stages[stageIndex].time, level: stages[stageIndex].level });
      };
      beginPointerDrag(e, hitEl, onMove);
    });
  });

  if (startMarker) {
    const { hitEl } = startMarker;
    hitEl.style.cursor = 'grab';
    hitEl.addEventListener('pointerdown', (e) => {
      const rect = svg.getBoundingClientRect();
      const pxPerUnitY = (rect.height || 1) / height;
      const startClientY = e.clientY;
      const startLevelVal = startLevel;
      const onMove = (ev) => {
        const dLevelPx = (ev.clientY - startClientY) / pxPerUnitY;
        startLevel = clamp(Math.round(startLevelVal + dLevelFromPx(dLevelPx)), levelMin, levelMax);
        render();
        onChange('start', { level: startLevel });
      };
      beginPointerDrag(e, hitEl, onMove);
    });
  }

  windowEl._setStages = (newStages) => { stages = newStages.map((s) => ({ ...s })); render(); };
  windowEl._getStages = () => stages.map((s) => ({ ...s }));
  windowEl._setStartLevel = (v) => { startLevel = v; render(); };
  windowEl._svg = svg;
  return windowEl;
}

// ─── G — Toggle-button group (2-way / 4-way) ───────────────────────────────
// fontSize/paddingX/paddingY override the app-wide defaults (e.g. the Effect
// tab's smaller OUT3/4 Pan pill).
export function toggleButtonGroup(config, onChange) {
  // inactiveColor: unselected text colour — Copy from Combination uses it so
  // required, unanswered questions don't look muted.
  const { options, value, fontSize = 10, paddingY = 6, paddingX = 14, inactiveColor } = config;
  const { wrap, buttons, setValue, getValue } = buildFusedToggleGroup(options, value, onChange, {
    fontSize, paddingY, paddingX, ...(inactiveColor ? { inactiveColor } : {}),
  });
  wrap.className = 'ctrl-toggle-group';
  buttons.forEach((btn) => btn.classList.add('ctrl-toggle-group-btn'));
  wrap._setValue = setValue;
  wrap._getValue = getValue;
  return wrap;
}

// ─── H — Checkbox ───────────────────────────────────────────────────────────
export function checkboxCtrl(config, onChange) {
  const { checked = false, label = '' } = config;

  const wrap = document.createElement('label');
  wrap.className = 'ctrl-checkbox';
  wrap.style.cssText = `display:inline-flex; align-items:center; gap:${px(4)}; ` +
    `cursor:pointer; font-size:${px(12)}; color:var(--text-primary);`;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'ctrl-checkbox-input';
  input.checked = checked;
  input.style.cssText = `width:${px(14)}; height:${px(14)}; accent-color:var(--accent-fill);`;
  input.addEventListener('change', () => onChange(input.checked));
  wrap.appendChild(input);

  if (label) {
    const span = document.createElement('span');
    span.className = 'ctrl-checkbox-label';
    span.textContent = label;
    wrap.appendChild(span);
  }

  wrap._setValue = (v) => { input.checked = v; };
  wrap._getValue = () => input.checked;
  wrap._input = input;
  return wrap;
}

// ─── Off/PRG override block ─────────────────────────────────────────────────
// Knob plus 0–2 direct-select override buttons. While an override is active the
// knob dims but keeps its value, restored when deselected. Supports
// bidirectional/format/readoutMode (e.g. Combi A:B Pan).
const OVERRIDE_LABELS = { off: 'OFF', prg: 'PRG' };

export function knobWithOverride(config, onChange) {
  const {
    min = 0, max = 99, value = 0, overrides = [], active = null, size = DEFAULT_KNOB_SIZE,
    bidirectional = false, format = null, readoutMode = 'beside',
    // stepper/besideGap/gap: opt-outs for dense layouts (Combi Timbres).
    stepper = true, besideGap = 10, gap = 4,
    // overrideStyle: 'stack' (default, vertical chips) or 'fused' (one pill via
    // buildFusedToggleGroup, used by Combi Timbres).
    overrideStyle = 'stack',
  } = config;
  let currentValue = clamp(value, min, max);
  let currentOverride = active;

  const wrap = document.createElement('span');
  wrap.className = 'ctrl-knob-override';
  wrap.style.cssText = `display:inline-flex; align-items:center; gap:${px(gap)};`;

  const fusedMode = overrideStyle === 'fused' && overrides.length > 0;
  const knobBuilder = bidirectional ? knobBidirectional : knobUnidirectional;
  // Fused mode: the knob has no readout; value and pill stack in a column beside it.
  const knob = knobBuilder({ min, max, value: currentValue, size, format, readoutMode, stepper, besideGap, readout: !fusedMode }, (v) => {
    currentValue = v;
    if (fusedMode) updateValueDisplay();
    onChange({ value: currentValue, override: currentOverride });
  });
  knob.style.transition = 'opacity 120ms';
  wrap.appendChild(knob);

  let setOverrideDisplay;
  let updateValueDisplay = () => {};
  // Fused mode's separate readout must be dimmed too.
  let fusedReadoutEl = null;

  if (fusedMode) {
    const col = document.createElement('span');
    col.className = 'ctrl-override-fused-col';
    col.style.cssText = `display:inline-flex; flex-direction:column; align-items:flex-start; gap:${px(4)};`;

    const readoutApi = buildReadout(currentValue, min, max, (v) => {
      currentValue = clamp(v, min, max);
      knob._setValue(currentValue);
      onChange({ value: currentValue, override: currentOverride });
    }, { centered: false, format, fontSize: 11, textAlign: 'left', stepper: true,
      dragPxPerUnit: () => knobPxPerUnit(knob._knob, min, max) });
    updateValueDisplay = () => readoutApi.setValue(currentValue);
    fusedReadoutEl = readoutApi.el;
    fusedReadoutEl.style.transition = 'opacity 120ms';
    col.appendChild(readoutApi.el);

    const items = overrides.map(key => ({ value: key, label: OVERRIDE_LABELS[key] ?? key.toUpperCase() }));
    const fused = buildFusedToggleGroup(items, currentOverride, (v) => {
      // Clicking the active override deselects it: undo the group's own selection.
      currentOverride = currentOverride === v ? null : v;
      updateDim();
      onChange({ value: currentValue, override: currentOverride });
    }, { fontSize: 10, paddingY: 3, paddingX: 8 });
    fused.wrap.classList.add('ctrl-override-fused');
    col.appendChild(fused.wrap);

    wrap.appendChild(col);
    setOverrideDisplay = () => fused.setValue(currentOverride);
  } else {
    const btnStack = document.createElement('span');
    btnStack.className = 'ctrl-override-btns';
    btnStack.style.cssText = `display:inline-flex; flex-direction:column; gap:${px(2)};`;

    const buttons = overrides.map((key) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ctrl-override-btn';
      btn.dataset.override = key;
      btn.textContent = OVERRIDE_LABELS[key] ?? key.toUpperCase();
      btn.style.cssText = btnBaseStyle();
      btn.addEventListener('click', () => {
        currentOverride = currentOverride === key ? null : key;
        updateDim();
        onChange({ value: currentValue, override: currentOverride });
      });
      btnStack.appendChild(btn);
      return { key, btn };
    });
    if (overrides.length) wrap.appendChild(btnStack);

    setOverrideDisplay = () => {
      buttons.forEach(({ key, btn }) => {
        const isActive = currentOverride === key;
        btn.style.background = isActive ? 'var(--accent-fill)' : 'var(--bg-button-neutral)';
        btn.style.color = isActive ? 'var(--bg-page)' : 'var(--text-secondary)';
        btn.style.borderColor = isActive ? 'var(--accent-line)' : 'var(--border-subtle)';
        btn.classList.toggle('active', isActive);
      });
    };
  }

  function updateDim() {
    knob.style.opacity = currentOverride ? '0.4' : '1';
    if (fusedReadoutEl) fusedReadoutEl.style.opacity = currentOverride ? '0.4' : '1';
    setOverrideDisplay();
  }
  updateDim();

  wrap._setValue = (v, ov) => {
    currentOverride = ov ?? null;
    // Adopt an incoming value only when no override is active — a sync while
    // overridden carries a placeholder, which would overwrite the real value
    // restored on deselect (Landmine #97).
    if (!currentOverride) currentValue = clamp(v, min, max);
    knob._setValue(currentValue);
    updateValueDisplay();
    updateDim();
  };
  wrap._getValue = () => ({ value: currentValue, override: currentOverride });
  wrap._knob = knob;
  return wrap;
}
