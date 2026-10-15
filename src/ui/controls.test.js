// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  clamp, px, arcPath, KNOB_SWEEP_START, KNOB_SWEEP_END, KNOB_SWEEP_TOTAL, DEFAULT_KNOB_SIZE,
  LARGE_KNOB_SIZE, SMALL_KNOB_SIZE, CHIP_RADIUS,
  knobUnidirectional, knobBidirectional, threeWayToggle,
  dualHandleRangeSlider, egGeometry, egMapY, egCurveWidget,
  toggleButtonGroup, checkboxCtrl, knobWithOverride, buildReadout, beginPointerDrag,
} from './controls.js';

// A centered readout (inside a knob) opens its editor on a press released
// without moving. The knob captures the pointer, so the release is watched on
// window, not as a click on the number (see controls.js) — tests dispatch
// pointerdown/pointerup, not a synthetic click. Opening the editor is
// deferred a tick (setTimeout 0), so callers must await.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function pointer(el, type, init = {}) {
  el.dispatchEvent(new window.PointerEvent(type, { bubbles: true, pointerId: 1, clientX: 10, clientY: 10, ...init }));
}
// The release is watched on window, so a centered readout under test must be
// in the document for its pointerup to reach it.
afterEach(() => { document.body.innerHTML = ''; });
function mounted(el) {
  document.body.appendChild(el);
  return el;
}
function pressAndRelease(el, downInit = {}, upInit = {}) {
  pointer(el, 'pointerdown', downInit);
  pointer(el, 'pointerup', upInit);
  return tick();
}

describe('clamp', () => {
  it('clamps below min and above max', () => {
    expect(clamp(-5, 0, 99)).toBe(0);
    expect(clamp(150, 0, 99)).toBe(99);
    expect(clamp(50, 0, 99)).toBe(50);
  });
});

describe('px', () => {
  it('wraps every dimension in a --control-scale calc()', () => {
    expect(px(48)).toBe('calc(var(--control-scale) * 48px)');
  });
});

describe('arcPath', () => {
  it('returns empty string when end <= start (zero/negative sweep)', () => {
    expect(arcPath(50, 50, 40, 10, 10)).toBe('');
    expect(arcPath(50, 50, 40, 10, 5)).toBe('');
  });
  it('produces a valid SVG arc command for a normal sweep', () => {
    const d = arcPath(50, 50, 40, KNOB_SWEEP_START, KNOB_SWEEP_END);
    expect(d).toMatch(/^M [\d.-]+ [\d.-]+ A 40 40 0 1 1 [\d.-]+ [\d.-]+$/);
  });
  it('uses the large-arc flag only when the sweep exceeds 180°', () => {
    const small = arcPath(50, 50, 40, 0, 90);
    const large = arcPath(50, 50, 40, 0, 200);
    expect(small).toContain('A 40 40 0 0 1');
    expect(large).toContain('A 40 40 0 1 1');
  });
});

describe('knobUnidirectional (variant A)', () => {
  it('renders a knob SVG plus a click-to-edit readout, colored only via tokens', () => {
    const onChange = vi.fn();
    const el = knobUnidirectional({ min: 0, max: 99, value: 50 }, onChange);
    expect(el.className).toBe('ctrl-knob-group');
    const knob = el.querySelector('.ctrl-knob-a');
    expect(knob).toBeTruthy();
    const svg = knob.querySelector('svg');
    expect(svg).toBeTruthy();
    const track = svg.querySelector('path:nth-child(1)');
    const valueArc = svg.querySelector('path:nth-child(2)');
    expect(track.getAttribute('stroke')).toBe('var(--track-empty)');
    expect(valueArc.getAttribute('stroke')).toBe('var(--accent-line)');
    expect(knob.style.width).toBe(px(DEFAULT_KNOB_SIZE));
    expect(el.querySelector('.ctrl-readout')).toBeTruthy();
  });

  it('draws no fill at the sweep start when value === min', () => {
    const el = knobUnidirectional({ min: 0, max: 99, value: 0 }, vi.fn());
    const valueArc = el.querySelector('.ctrl-knob-a svg path:nth-child(2)');
    expect(valueArc.getAttribute('d')).toBe('');
  });

  it('draws the full track when value === max', () => {
    const el = knobUnidirectional({ min: 0, max: 99, value: 99 }, vi.fn());
    const valueArc = el.querySelector('.ctrl-knob-a svg path:nth-child(2)');
    const expected = arcPath(50, 50, 40, KNOB_SWEEP_START, KNOB_SWEEP_END);
    expect(valueArc.getAttribute('d')).toBe(expected);
  });

  it('fires onChange with a clamped value when the readout is clicked and edited', async () => {
    const onChange = vi.fn();
    const el = mounted(knobUnidirectional({ min: 0, max: 99, value: 10 }, onChange));
    const readout = el.querySelector('.ctrl-readout');
    await pressAndRelease(readout);
    const input = el.querySelector('.ctrl-readout-input');
    expect(input).toBeTruthy();
    input.value = '150'; // out of range — must clamp to max
    input.dispatchEvent(new window.Event('blur'));
    expect(onChange).toHaveBeenCalledWith(99);
  });

  it('does not open the editor on a pointerdown alone — only once it is released', async () => {
    const el = knobUnidirectional({ min: 0, max: 99, value: 10 }, vi.fn());
    pointer(el.querySelector('.ctrl-readout'), 'pointerdown');
    await tick();
    expect(el.querySelector('.ctrl-readout-input')).toBeFalsy();
  });

  it('does not open the editor when the press moves before release (a knob drag), and the drag turns the knob', async () => {
    const onChange = vi.fn();
    const el = mounted(knobUnidirectional({ min: 0, max: 99, value: 10 }, onChange));
    const readout = el.querySelector('.ctrl-readout');
    pointer(readout, 'pointerdown');
    pointer(readout, 'pointermove', { clientY: 0, buttons: 1 });
    pointer(readout, 'pointerup', { clientY: 0 });
    await tick();
    expect(el.querySelector('.ctrl-readout-input')).toBeFalsy();
    expect(onChange).toHaveBeenCalled();
  });

  it('a press that moves less than the threshold is still a click and does not nudge the knob', async () => {
    const onChange = vi.fn();
    const el = mounted(knobUnidirectional({ min: 0, max: 99, value: 10 }, onChange));
    const readout = el.querySelector('.ctrl-readout');
    pointer(readout, 'pointerdown');
    pointer(readout, 'pointermove', { clientY: 8, buttons: 1 });
    pointer(readout, 'pointerup', { clientY: 8 });
    await tick();
    expect(onChange).not.toHaveBeenCalled();
    expect(el.querySelector('.ctrl-readout-input')).toBeTruthy();
  });

  it.each([
    ['right-click', { button: 2 }],
    ['Ctrl-click', { ctrlKey: true }],
  ])('does not open the editor on a %s', async (_label, init) => {
    const el = mounted(knobUnidirectional({ min: 0, max: 99, value: 10 }, vi.fn()));
    await pressAndRelease(el.querySelector('.ctrl-readout'), init);
    expect(el.querySelector('.ctrl-readout-input')).toBeFalsy();
  });

  it('does not stop a pointerdown on the readout from bubbling — a drag starting on the value must still turn the knob', () => {
    const el = knobUnidirectional({ min: 0, max: 99, value: 10 }, vi.fn());
    const wrapHandler = vi.fn();
    el.querySelector('.ctrl-knob-a').addEventListener('pointerdown', wrapHandler);
    el.querySelector('.ctrl-readout').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    expect(wrapHandler).toHaveBeenCalled();
  });

  it('fires onChange live on every keystroke, not just on blur/Enter', async () => {
    const onChange = vi.fn();
    const el = mounted(knobUnidirectional({ min: 0, max: 99, value: 10 }, onChange));
    await pressAndRelease(el.querySelector('.ctrl-readout'));
    const input = el.querySelector('.ctrl-readout-input');
    input.value = '42';
    input.dispatchEvent(new window.Event('input'));
    expect(onChange).toHaveBeenCalledWith(42);
    expect(el.querySelector('.ctrl-readout-input')).toBeTruthy(); // still editing — no blur yet
  });

  it('updates the readout text when the value changes via _setValue (same path drag uses)', () => {
    const el = knobUnidirectional({ min: 0, max: 99, value: 10 }, vi.fn());
    expect(el.querySelector('.ctrl-readout').textContent).toBe('10');
    el._setValue(75);
    expect(el.querySelector('.ctrl-readout').textContent).toBe('75');
  });

  it('positions the readout centered inside the knob face, not beside it', () => {
    const el = knobUnidirectional({ min: 0, max: 99, value: 10 }, vi.fn());
    const readout = el.querySelector('.ctrl-readout');
    expect(el.querySelector('.ctrl-knob-a').contains(readout)).toBe(true);
    expect(readout.style.position).toBe('absolute');
  });

  describe('readoutMode "below" (VDA hero knob, e.g. Level)', () => {
    it('defaults to LARGE_KNOB_SIZE and places the readout outside the knob face', () => {
      const el = knobUnidirectional({ min: 0, max: 99, value: 82, readoutMode: 'below' }, vi.fn());
      expect(el.className).toBe('ctrl-knob-group ctrl-knob-below');
      const knob = el.querySelector('.ctrl-knob-a');
      expect(knob.style.width).toBe(px(LARGE_KNOB_SIZE));
      const readout = el.querySelector('.ctrl-readout');
      expect(knob.contains(readout)).toBe(false);
      expect(readout.style.position).not.toBe('absolute');
      expect(readout.textContent).toBe('82');
    });

    it('still respects an explicit size override', () => {
      const el = knobUnidirectional({ min: 0, max: 99, value: 10, readoutMode: 'below', size: 100 }, vi.fn());
      expect(el.querySelector('.ctrl-knob-a').style.width).toBe(px(100));
    });
  });

  describe('readoutMode "beside" (VDA compact knobs)', () => {
    it('defaults to SMALL_KNOB_SIZE and renders the given label next to the readout', () => {
      const el = knobUnidirectional({ min: 0, max: 99, value: 5, readoutMode: 'beside', label: 'EG Time KBD Track' }, vi.fn());
      expect(el.className).toBe('ctrl-knob-group ctrl-knob-beside');
      expect(el.querySelector('.ctrl-knob-a').style.width).toBe(px(SMALL_KNOB_SIZE));
      expect(el.querySelector('.ctrl-knob-beside-label').textContent).toBe('EG Time KBD Track');
      expect(el.querySelector('.ctrl-readout').textContent).toBe('5');
    });

    it('omits the label element entirely when none is given', () => {
      const el = knobUnidirectional({ min: 0, max: 99, value: 5, readoutMode: 'beside' }, vi.fn());
      expect(el.querySelector('.ctrl-knob-beside-label')).toBeFalsy();
    });
  });

  describe('format (e.g. KBD Track Key note-name display)', () => {
    const noteName = (v) => `note${v}`;

    it('renders the formatted string but edits/commits the raw numeric value', () => {
      const onChange = vi.fn();
      const el = knobUnidirectional({ min: 0, max: 127, value: 60, readoutMode: 'beside', format: noteName }, onChange);
      const readout = el.querySelector('.ctrl-readout');
      expect(readout.textContent).toBe('note60');
      readout.click(); // non-centered readout (below/beside) is single-click-to-edit
      const input = el.querySelector('.ctrl-readout-input');
      expect(input.value).toBe('60'); // seeded from the raw value, not the formatted "note60" text
      input.value = '64';
      input.dispatchEvent(new window.Event('blur'));
      expect(onChange).toHaveBeenCalledWith(64);
      expect(el.querySelector('.ctrl-readout').textContent).toBe('note64');
    });
  });

  describe('step (e.g. Chorus/Flanger-Delay Delay Time, 2ms increments)', () => {
    it('snaps a typed value to the nearest step', async () => {
      const onChange = vi.fn();
      const el = knobUnidirectional({ min: 0, max: 450, value: 100, readoutMode: 'beside', step: 2 }, onChange);
      const readout = el.querySelector('.ctrl-readout');
      readout.click();
      const input = el.querySelector('.ctrl-readout-input');
      input.value = '151';
      input.dispatchEvent(new window.Event('blur'));
      expect(onChange).toHaveBeenCalledWith(152);
    });

    it('steps the spinner buttons by the given step, not by 1', () => {
      const onChange = vi.fn();
      const el = knobUnidirectional({ min: 0, max: 450, value: 100, readoutMode: 'beside', step: 2 }, onChange);
      const upBtn = el.querySelectorAll('.ctrl-readout-step')[0];
      upBtn.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
      upBtn.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      expect(onChange).toHaveBeenCalledWith(102);
    });

    it('snaps an initial off-step value and a later _setValue call the same way', () => {
      const onChange = vi.fn();
      const el = knobUnidirectional({ min: 0, max: 450, value: 101, readoutMode: 'beside', step: 2 }, onChange);
      expect(el.querySelector('.ctrl-readout').textContent).toBe('102');
      el._setValue(155);
      expect(el.querySelector('.ctrl-readout').textContent).toBe('156');
    });
  });
});

describe('knobBidirectional (variant B)', () => {
  it('sweeps the fill arc from the 12 o\'clock midpoint (zero), not the sweep start', () => {
    const onChange = vi.fn();
    const positive = knobBidirectional({ min: -99, max: 99, value: 50 }, onChange);
    const arcPos = positive.querySelector('.ctrl-knob-b svg path:nth-child(2)').getAttribute('d');
    // Zero sits at the exact midpoint of the sweep for a symmetric range.
    const zeroAngle = KNOB_SWEEP_START + 0.5 * KNOB_SWEEP_TOTAL;
    const posFrac = (50 - -99) / 198;
    const posAngle = KNOB_SWEEP_START + posFrac * KNOB_SWEEP_TOTAL;
    expect(arcPos).toBe(arcPath(50, 50, 40, zeroAngle, posAngle));

    const negative = knobBidirectional({ min: -99, max: 99, value: -50 }, vi.fn());
    const arcNeg = negative.querySelector('.ctrl-knob-b svg path:nth-child(2)').getAttribute('d');
    const negFrac = (-50 - -99) / 198;
    const negAngle = KNOB_SWEEP_START + negFrac * KNOB_SWEEP_TOTAL;
    expect(arcNeg).toBe(arcPath(50, 50, 40, negAngle, zeroAngle));
  });

  it('draws no arc at value === 0 (zero-width sweep)', () => {
    const el = knobBidirectional({ min: -99, max: 99, value: 0 }, vi.fn());
    const d = el.querySelector('.ctrl-knob-b svg path:nth-child(2)').getAttribute('d');
    expect(d).toBe('');
  });
});

describe('buildReadout stepper (universal hover-reveal up/down nudge)', () => {
  it('returns the bare readout with no wrapper when stepper is not requested', () => {
    const { el } = buildReadout(10, 0, 99, vi.fn());
    expect(el.classList.contains('ctrl-readout')).toBe(true);
    expect(el.querySelector('.ctrl-readout-stepper')).toBeFalsy();
  });

  it('wraps the readout and adds a hidden-until-hover stepper with two buttons', () => {
    const { el } = buildReadout(10, 0, 99, vi.fn(), { stepper: true });
    expect(el.classList.contains('ctrl-readout-wrap')).toBe(true);
    expect(el.querySelector('.ctrl-readout')).toBeTruthy();
    expect(el.querySelectorAll('.ctrl-readout-step').length).toBe(2);
  });

  it('increments/decrements the value and fires onCommit immediately on pointerdown (not on release)', () => {
    const onCommit = vi.fn();
    const { el } = buildReadout(10, 0, 99, onCommit, { stepper: true });
    const [upBtn, downBtn] = el.querySelectorAll('.ctrl-readout-step');
    upBtn.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    expect(onCommit).toHaveBeenCalledWith(11); // stepped on down, before any up event
    expect(el.querySelector('.ctrl-readout').textContent).toBe('11');
    upBtn.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));

    downBtn.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    downBtn.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    downBtn.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    downBtn.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    expect(onCommit).toHaveBeenLastCalledWith(9);
  });

  it('clamps stepper nudges to min/max', () => {
    const onCommit = vi.fn();
    const { el } = buildReadout(99, 0, 99, onCommit, { stepper: true });
    const [upBtn] = el.querySelectorAll('.ctrl-readout-step');
    upBtn.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    expect(onCommit).toHaveBeenCalledWith(99);
  });

  it('auto-repeats while the button is held down, and stops on pointerup', () => {
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      const { el } = buildReadout(0, 0, 99, onCommit, { stepper: true });
      const [upBtn] = el.querySelectorAll('.ctrl-readout-step');
      upBtn.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
      expect(onCommit).toHaveBeenCalledTimes(1); // immediate step on down
      vi.advanceTimersByTime(399);
      expect(onCommit).toHaveBeenCalledTimes(1); // repeat hasn't started yet
      vi.advanceTimersByTime(1); // crosses the 400ms initial delay — starts the interval, doesn't itself step
      expect(onCommit).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(80); // interval's first tick
      expect(onCommit).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(80);
      expect(onCommit).toHaveBeenCalledTimes(3);
      upBtn.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
      vi.advanceTimersByTime(500); // repeat must not continue after release
      expect(onCommit).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores non-primary buttons (a right-click must not step or start a repeat)', () => {
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      const { el } = buildReadout(0, 0, 99, onCommit, { stepper: true });
      const [upBtn] = el.querySelectorAll('.ctrl-readout-step');
      upBtn.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 2, buttons: 2 }));
      vi.advanceTimersByTime(1000);
      expect(onCommit).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  // B2: a swallowed pointerup (context menu, app switch) must not leave the
  // repeat sending Parameter Changes (Landmine #107's shape).
  for (const [name, fire] of [
    ['lostpointercapture', (btn) => btn.dispatchEvent(new window.PointerEvent('lostpointercapture', { pointerId: 1 }))],
    ['a pointermove with no button held', (btn) => btn.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 1, buttons: 0 }))],
    ['window blur', () => window.dispatchEvent(new window.Event('blur'))],
  ]) {
    it(`stops auto-repeat on ${name}`, () => {
      vi.useFakeTimers();
      try {
        const onCommit = vi.fn();
        const { el } = buildReadout(0, 0, 99, onCommit, { stepper: true });
        const [upBtn] = el.querySelectorAll('.ctrl-readout-step');
        upBtn.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0, buttons: 1 }));
        vi.advanceTimersByTime(480);
        expect(onCommit).toHaveBeenCalledTimes(2);
        fire(upBtn);
        vi.advanceTimersByTime(1000);
        expect(onCommit).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
  }

  it('keeps repeating through a pointermove with the button still held', () => {
    vi.useFakeTimers();
    try {
      const onCommit = vi.fn();
      const { el } = buildReadout(0, 0, 99, onCommit, { stepper: true });
      const [upBtn] = el.querySelectorAll('.ctrl-readout-step');
      upBtn.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0, buttons: 1 }));
      vi.advanceTimersByTime(480);
      upBtn.dispatchEvent(new window.PointerEvent('pointermove', { bubbles: true, pointerId: 1, buttons: 1 }));
      vi.advanceTimersByTime(160);
      expect(onCommit).toHaveBeenCalledTimes(4);
      upBtn.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    } finally {
      vi.useRealTimers();
    }
  });

  it('knobUnidirectional/knobBidirectional include the stepper for below/beside readoutMode but not centered', () => {
    const centered = knobUnidirectional({ min: 0, max: 99, value: 10 }, vi.fn());
    expect(centered.querySelector('.ctrl-readout-stepper')).toBeFalsy();
    const below = knobUnidirectional({ min: 0, max: 99, value: 10, readoutMode: 'below' }, vi.fn());
    expect(below.querySelector('.ctrl-readout-stepper')).toBeTruthy();
    const beside = knobBidirectional({ min: -99, max: 99, value: 10, readoutMode: 'beside' }, vi.fn());
    expect(beside.querySelector('.ctrl-readout-stepper')).toBeTruthy();
  });
});

describe('threeWayToggle (variant D)', () => {
  it('renders one button per value/label pair and marks the active one', () => {
    const el = threeWayToggle({ value: 0 }, vi.fn());
    const buttons = el.querySelectorAll('.ctrl-toggle3-btn');
    expect(buttons.length).toBe(3);
    expect(buttons[1].classList.contains('active')).toBe(true);
    expect(buttons[0].classList.contains('active')).toBe(false);
  });

  it('fires onChange with the clicked value and updates active state', () => {
    const onChange = vi.fn();
    const el = threeWayToggle({ value: 0, values: [-1, 0, 1], labels: ['−', 'off', '+'] }, onChange);
    const buttons = el.querySelectorAll('.ctrl-toggle3-btn');
    buttons[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith(1);
    expect(buttons[2].classList.contains('active')).toBe(true);
    expect(buttons[1].classList.contains('active')).toBe(false);
  });

  it('renders as one fused strip — a single outer border, no per-button border or gap (per the VDA mockup)', () => {
    const el = threeWayToggle({ value: 0 }, vi.fn());
    expect(el.style.border).toBe('1px solid var(--border-subtle)');
    expect(el.style.borderRadius).toBe(px(CHIP_RADIUS));
    expect(el.style.overflow).toBe('hidden');
    const buttons = el.querySelectorAll('.ctrl-toggle3-btn');
    buttons.forEach((btn) => expect(btn.style.borderStyle).toBe('none'));
  });
});

describe('dualHandleRangeSlider (variant E)', () => {
  it('renders two numeric fields and two drag handles', () => {
    const el = dualHandleRangeSlider({ min: 0, max: 99, low: 10, high: 80 }, vi.fn());
    expect(el.querySelectorAll('.ctrl-range-e-field').length).toBe(2);
    expect(el.querySelector('.ctrl-range-e-handle-lo')).toBeTruthy();
    expect(el.querySelector('.ctrl-range-e-handle-hi')).toBeTruthy();
  });

  it('swaps out-of-order construction values so low <= high', () => {
    const el = dualHandleRangeSlider({ min: 0, max: 99, low: 80, high: 10 }, vi.fn());
    const [loField, hiField] = el.querySelectorAll('.ctrl-range-e-field');
    expect(Number(loField.value)).toBe(10);
    expect(Number(hiField.value)).toBe(80);
  });

  it('clamps the low handle so it can never cross the high handle', () => {
    const onChange = vi.fn();
    const el = dualHandleRangeSlider({ min: 0, max: 99, low: 10, high: 50 }, onChange);
    const [loField] = el.querySelectorAll('.ctrl-range-e-field');
    loField.value = '90'; // attempt to push low past high
    loField.dispatchEvent(new window.Event('change'));
    expect(onChange).toHaveBeenLastCalledWith({ low: 50, high: 50 });
  });

  it('clamps the high handle so it can never cross the low handle', () => {
    const onChange = vi.fn();
    const el = dualHandleRangeSlider({ min: 0, max: 99, low: 40, high: 60 }, onChange);
    const [, hiField] = el.querySelectorAll('.ctrl-range-e-field');
    hiField.value = '5'; // attempt to push high below low
    hiField.dispatchEvent(new window.Event('change'));
    expect(onChange).toHaveBeenLastCalledWith({ low: 40, high: 40 });
  });

  it('clamps numeric field commits to the configured min/max', () => {
    const onChange = vi.fn();
    const el = dualHandleRangeSlider({ min: 0, max: 99, low: 10, high: 50 }, onChange);
    const [, hiField] = el.querySelectorAll('.ctrl-range-e-field');
    hiField.value = '500';
    hiField.dispatchEvent(new window.Event('change'));
    expect(onChange).toHaveBeenLastCalledWith({ low: 10, high: 99 });
  });
});

describe('egGeometry (variant F math)', () => {
  it('places the sustain plateau at a fixed ~20% of total window width regardless of stage times', () => {
    const stages = [
      { key: 'attack', time: 10, level: 99 },
      { key: 'decay', time: 10, level: 50 },
      { key: 'slope', time: 10, level: 30 },
      { key: 'release', time: 10, level: 0 },
    ];
    const geo = egGeometry({ stages, timeMax: 99, pxPerTimeUnit: 2, sustainAfter: 'slope', sustainWidthFrac: 0.2 });
    expect(geo.sustainWidth).toBeCloseTo(geo.totalWidth * 0.2, 5);
  });

  it('uses a constant pixels-per-time-unit scale — doubling a stage time doubles its segment width', () => {
    const base = egGeometry({
      stages: [{ key: 'attack', time: 10, level: 99 }],
      timeMax: 99, pxPerTimeUnit: 2, sustainAfter: null,
    });
    const doubled = egGeometry({
      stages: [{ key: 'attack', time: 20, level: 99 }],
      timeMax: 99, pxPerTimeUnit: 2, sustainAfter: null,
    });
    expect(doubled.points[0].x).toBeCloseTo(base.points[0].x * 2, 5);
  });

  it('sizes the window for the worst case: every stage at its max time', () => {
    const geo = egGeometry({
      stages: [{ key: 'a', time: 99, level: 0 }, { key: 'b', time: 99, level: 0 }],
      timeMax: 99, pxPerTimeUnit: 1, sustainAfter: null,
    });
    expect(geo.totalWidth).toBe(2 * 99 * 1);
  });
});

describe('egMapY', () => {
  it('floor mode maps levelMin to the bottom and levelMax to the top', () => {
    expect(egMapY(0, 'floor', 0, 99, 90)).toBe(90);
    expect(egMapY(99, 'floor', 0, 99, 90)).toBe(0);
  });
  it('center mode maps 0 to the vertical middle', () => {
    expect(egMapY(0, 'center', -99, 99, 90)).toBe(45);
  });
});

describe('egCurveWidget (variant F)', () => {
  it('renders an SVG trace plus one marker per editable stage point', () => {
    const stages = [
      { key: 'attack', time: 10, level: 99 },
      { key: 'decay', time: 10, level: 50 },
      { key: 'slope', time: 10, level: 30 },
      { key: 'release', time: 10, level: 0 },
    ];
    const el = egCurveWidget({ mode: 'floor', levelMin: 0, levelMax: 99, startLevel: 0, stages, sustainAfter: 'slope' }, vi.fn());
    expect(el.querySelector('.ctrl-eg-trace')).toBeTruthy();
    expect(el.querySelectorAll('.ctrl-eg-marker').length).toBe(4);
  });

  it('draws a dimmed ghost trace when a ghost overlay is supplied', () => {
    const stages = [{ key: 'attack', time: 10, level: 99 }, { key: 'release', time: 10, level: 0 }];
    const ghostStages = [{ key: 'attack', time: 30, level: 99 }, { key: 'release', time: 30, level: 0 }];
    const el = egCurveWidget(
      { mode: 'floor', levelMin: 0, levelMax: 99, startLevel: 0, stages, sustainAfter: null, ghost: { stages: ghostStages } },
      vi.fn(),
    );
    const ghost = el.querySelector('.ctrl-eg-ghost');
    expect(ghost).toBeTruthy();
    expect(Number(ghost.getAttribute('opacity'))).toBeLessThan(1);
  });

  it('gives the ghost trace the same stroke weight as the main trace — dimming comes from opacity alone', () => {
    const stages = [{ key: 'attack', time: 10, level: 99 }, { key: 'release', time: 10, level: 0 }];
    const ghostStages = [{ key: 'attack', time: 30, level: 99 }, { key: 'release', time: 30, level: 0 }];
    const el = egCurveWidget(
      { mode: 'floor', levelMin: 0, levelMax: 99, startLevel: 0, stages, sustainAfter: null, ghost: { stages: ghostStages } },
      vi.fn(),
    );
    const ghost = el.querySelector('.ctrl-eg-ghost');
    const main = el.querySelector('.ctrl-eg-trace');
    expect(ghost.getAttribute('stroke-width')).toBe(main.getAttribute('stroke-width'));
  });

  it('matches the current sizing: 2px stroke width, 3px marker radius (as a round ellipse, scaleX=1 by default), 1.2px/time-unit by default', () => {
    const stages = [{ key: 'attack', time: 10, level: 99 }, { key: 'release', time: 10, level: 0 }];
    const el = egCurveWidget({ mode: 'floor', levelMin: 0, levelMax: 99, startLevel: 0, stages, sustainAfter: null }, vi.fn());
    expect(el.querySelector('.ctrl-eg-trace').getAttribute('stroke-width')).toBe('2');
    // No `width` override -> scaleX is 1, so rx/ry both equal the nominal
    // marker radius (a true circle, not an ellipse) — see egCurveWidget's
    // scaleX comment for why markers use rx/ry instead of a plain r.
    expect(Number(el.querySelector('.ctrl-eg-marker').getAttribute('rx'))).toBeCloseTo(3, 5);
    expect(el.querySelector('.ctrl-eg-marker').getAttribute('ry')).toBe('3');
    const geo = egGeometry({ stages, timeMax: 99, sustainAfter: null });
    expect(geo.points[0].x).toBeCloseTo(10 * 1.2, 5);
  });

  it('compensates marker rx (not ry) when a caller-overridden width differs from the geometry\'s natural width, keeping markers visually round', () => {
    const stages = [{ key: 'attack', time: 10, level: 99 }, { key: 'release', time: 10, level: 0 }];
    const geo = egGeometry({ stages, timeMax: 99, sustainAfter: null });
    const overriddenWidth = geo.totalWidth; // narrower than the natural window (which adds 2*14 padding)
    const el = egCurveWidget({ mode: 'floor', levelMin: 0, levelMax: 99, startLevel: 0, stages, sustainAfter: null, width: overriddenWidth }, vi.fn());
    const scaleX = (overriddenWidth - 2 * 14) / geo.totalWidth;
    expect(Number(el.querySelector('.ctrl-eg-marker').getAttribute('rx'))).toBeCloseTo(3 / scaleX, 5);
    expect(el.querySelector('.ctrl-eg-marker').getAttribute('ry')).toBe('3');
  });

  it('renders a fixed pixel-size window (not responsive), sized additively around the curve with a 14px inset gap on every side', () => {
    const stages = [{ key: 'attack', time: 10, level: 99 }, { key: 'release', time: 10, level: 0 }];
    const el = egCurveWidget({ mode: 'floor', levelMin: 0, levelMax: 99, startLevel: 0, stages, sustainAfter: null, height: 90 }, vi.fn());
    const geo = egGeometry({ stages, timeMax: 99, sustainAfter: null, height: 90 });
    const windowWidth = geo.totalWidth + 2 * 14;
    const windowHeight = 90 + 2 * 14;
    expect(el.style.width).toBe(px(windowWidth));
    expect(el.style.height).toBe(px(windowHeight));
    // The inner curve box (child of the padded window) fills the padding's
    // content box, so the padding itself is what creates the inset gap.
    const inner = el.querySelector('.ctrl-eg');
    expect(inner.style.width).toBe('100%');
    expect(inner.style.height).toBe('100%');
  });

  it('draws a reference line — floor mode at the level-0 baseline, center mode at the vertical middle — with a constant on-screen stroke weight via non-scaling-stroke', () => {
    const stages = [{ key: 'attack', time: 10, level: 99 }, { key: 'release', time: 10, level: 0 }];
    const floorEl = egCurveWidget({ mode: 'floor', levelMin: 0, levelMax: 99, startLevel: 0, stages, sustainAfter: null, height: 90 }, vi.fn());
    const floorLine = floorEl.querySelector('.ctrl-eg-ref-line');
    expect(floorLine).toBeTruthy();
    expect(Number(floorLine.getAttribute('y1'))).toBeCloseTo(90, 5); // level 0 -> bottom edge in floor mode
    expect(floorLine.getAttribute('vector-effect')).toBe('non-scaling-stroke');

    const centerEl = egCurveWidget({ mode: 'center', levelMin: -99, levelMax: 99, startLevel: 0, stages, sustainAfter: null, height: 90 }, vi.fn());
    const centerLine = centerEl.querySelector('.ctrl-eg-ref-line');
    expect(Number(centerLine.getAttribute('y1'))).toBeCloseTo(45, 5); // level 0 -> vertical middle in center mode
    expect(centerLine.getAttribute('vector-effect')).toBe('non-scaling-stroke');

    // Same treatment in both modes — not two different lines with two
    // different weights.
    expect(floorLine.getAttribute('stroke-width')).toBe(centerLine.getAttribute('stroke-width'));
    expect(floorLine.getAttribute('opacity')).toBe(centerLine.getAttribute('opacity'));
  });

  it('gives the trace and ghost non-scaling-stroke too, so line weight stays constant regardless of any caller-overridden width', () => {
    const stages = [{ key: 'attack', time: 10, level: 99 }, { key: 'release', time: 10, level: 0 }];
    const el = egCurveWidget(
      { mode: 'floor', levelMin: 0, levelMax: 99, startLevel: 0, stages, sustainAfter: null, ghost: { stages } },
      vi.fn(),
    );
    expect(el.querySelector('.ctrl-eg-trace').getAttribute('vector-effect')).toBe('non-scaling-stroke');
    expect(el.querySelector('.ctrl-eg-ghost').getAttribute('vector-effect')).toBe('non-scaling-stroke');
  });

  it('markers follow the value-color theme toggle (var(--value-color)) — the curve trace itself always stays the fixed accent color', () => {
    const stages = [{ key: 'attack', time: 10, level: 99 }, { key: 'release', time: 10, level: 0 }];
    const el = egCurveWidget({ mode: 'floor', levelMin: 0, levelMax: 99, startLevel: 0, stages, sustainAfter: null }, vi.fn());
    expect(el.querySelector('.ctrl-eg-marker').getAttribute('fill')).toBe('var(--value-color)');
    expect(el.querySelector('.ctrl-eg-trace').getAttribute('stroke')).toBe('var(--accent-line)');
  });
});

describe('toggleButtonGroup (variant G)', () => {
  it('supports a 2-way group', () => {
    const onChange = vi.fn();
    const el = toggleButtonGroup({ options: [{ value: 'sin', label: 'Sin' }, { value: 'tri', label: 'Tri' }], value: 'sin' }, onChange);
    const buttons = el.querySelectorAll('.ctrl-toggle-group-btn');
    expect(buttons.length).toBe(2);
    buttons[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith('tri');
  });

  it('supports a 4-way group', () => {
    const opts = [{ value: 0, label: 'OFF' }, { value: 1, label: 'LOW' }, { value: 2, label: 'HIGH' }, { value: 3, label: 'ALL' }];
    const onChange = vi.fn();
    const el = toggleButtonGroup({ options: opts, value: 0 }, onChange);
    const buttons = el.querySelectorAll('.ctrl-toggle-group-btn');
    expect(buttons.length).toBe(4);
    buttons[3].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('renders as one fused strip, same shape language as threeWayToggle', () => {
    const opts = [{ value: 0, label: 'OFF' }, { value: 1, label: 'LOW' }];
    const el = toggleButtonGroup({ options: opts, value: 0 }, vi.fn());
    expect(el.style.border).toBe('1px solid var(--border-subtle)');
    expect(el.style.borderRadius).toBe(px(CHIP_RADIUS));
    const buttons = el.querySelectorAll('.ctrl-toggle-group-btn');
    buttons.forEach((btn) => expect(btn.style.borderStyle).toBe('none'));
  });
});

describe('checkboxCtrl (variant H)', () => {
  it('reflects the initial checked state and an optional label', () => {
    const el = checkboxCtrl({ checked: true, label: 'Mute' }, vi.fn());
    expect(el.querySelector('.ctrl-checkbox-input').checked).toBe(true);
    expect(el.querySelector('.ctrl-checkbox-label').textContent).toBe('Mute');
  });

  it('fires onChange with the new checked state', () => {
    const onChange = vi.fn();
    const el = checkboxCtrl({ checked: false }, onChange);
    const input = el.querySelector('.ctrl-checkbox-input');
    input.checked = true;
    input.dispatchEvent(new window.Event('change'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('knobWithOverride', () => {
  it('renders one button per configured override, in icon-stack order', () => {
    const el = knobWithOverride({ min: 0, max: 99, value: 50, overrides: ['off', 'prg'] }, vi.fn());
    const buttons = el.querySelectorAll('.ctrl-override-btn');
    expect(buttons.length).toBe(2);
    expect(buttons[0].dataset.override).toBe('off');
    expect(buttons[1].dataset.override).toBe('prg');
  });

  it('renders zero override buttons when none are configured', () => {
    const el = knobWithOverride({ min: 0, max: 99, value: 50, overrides: [] }, vi.fn());
    expect(el.querySelectorAll('.ctrl-override-btn').length).toBe(0);
  });

  it('shows the knob\'s numeric readout, not just the bare arc', () => {
    const el = knobWithOverride({ min: 0, max: 99, value: 50, overrides: ['off', 'prg'] }, vi.fn());
    expect(el.querySelector('.ctrl-readout').textContent).toBe('50');
  });

  it('sizes its knob the same as the standalone knob variants by default', () => {
    const el = knobWithOverride({ min: 0, max: 99, value: 50, overrides: ['off'] }, vi.fn());
    expect(el.querySelector('.ctrl-knob-a').style.width).toBe(px(DEFAULT_KNOB_SIZE));
  });

  it('dims the knob and fires onChange with the override key when a button is clicked', () => {
    const onChange = vi.fn();
    const el = knobWithOverride({ min: 0, max: 99, value: 50, overrides: ['off', 'prg'] }, onChange);
    const [offBtn] = el.querySelectorAll('.ctrl-override-btn');
    offBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith({ value: 50, override: 'off' });
    expect(el._knob.style.opacity).toBe('0.4');
  });

  it('retains the knob value underneath when an override is toggled back off', () => {
    const onChange = vi.fn();
    const el = knobWithOverride({ min: 0, max: 99, value: 50, overrides: ['off'] }, onChange);
    const [offBtn] = el.querySelectorAll('.ctrl-override-btn');
    offBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // activate
    offBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); // deactivate
    expect(onChange).toHaveBeenLastCalledWith({ value: 50, override: null });
    expect(el._knob.style.opacity).toBe('1');
  });
});

describe('beginPointerDrag', () => {
  const ptr = (type, init = {}) => new window.PointerEvent(type, { bubbles: true, pointerId: 1, ...init });

  function startDrag(downInit = {}) {
    const el = document.createElement('div');
    const onMove = vi.fn();
    el.addEventListener('pointerdown', (e) => beginPointerDrag(e, el, onMove));
    el.dispatchEvent(ptr('pointerdown', { button: 0, buttons: 1, ...downInit }));
    return { el, onMove };
  }

  it('calls onMove while the primary button is held, and stops after pointerup', () => {
    const { el, onMove } = startDrag();
    el.dispatchEvent(ptr('pointermove', { buttons: 1 }));
    expect(onMove).toHaveBeenCalledTimes(1);
    el.dispatchEvent(ptr('pointerup', { buttons: 0 }));
    el.dispatchEvent(ptr('pointermove', { buttons: 1 }));
    expect(onMove).toHaveBeenCalledTimes(1);
  });

  it.each(['pointercancel', 'lostpointercapture'])('ends the drag on %s', (type) => {
    const { el, onMove } = startDrag();
    el.dispatchEvent(ptr(type));
    el.dispatchEvent(ptr('pointermove', { buttons: 1 }));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('treats a pointermove with no button held as a missed release and ends the drag', () => {
    const { el, onMove } = startDrag();
    el.dispatchEvent(ptr('pointermove', { buttons: 0 })); // hover after a swallowed pointerup
    el.dispatchEvent(ptr('pointermove', { buttons: 1 }));
    expect(onMove).not.toHaveBeenCalled();
  });

  it.each([
    ['right-click', { button: 2, buttons: 2 }],
    ['Ctrl-click (macOS context-menu click)', { ctrlKey: true }],
  ])('does not start a drag on %s', (_label, init) => {
    const { el, onMove } = startDrag(init);
    el.dispatchEvent(ptr('pointermove', { buttons: 1 }));
    expect(onMove).not.toHaveBeenCalled();
  });

  it('listens on listenEl when one is given', () => {
    const parent = document.createElement('div');
    const handle = document.createElement('div');
    parent.appendChild(handle);
    const onMove = vi.fn();
    handle.addEventListener('pointerdown', (e) => beginPointerDrag(e, handle, onMove, parent));
    handle.dispatchEvent(ptr('pointerdown', { button: 0, buttons: 1 }));
    parent.dispatchEvent(ptr('pointermove', { buttons: 1 }));
    expect(onMove).toHaveBeenCalledTimes(1);
  });
});

describe('buildReadout drag (non-centered readouts, Archive #223)', () => {
  function setup(opts = {}) {
    const onCommit = vi.fn();
    const r = buildReadout(10, 0, 99, onCommit, { dragPxPerUnit: 2, ...opts });
    document.body.appendChild(r.el);
    return { el: r.el, onCommit };
  }

  it('a vertical drag changes the value at dragPxPerUnit (up = more)', () => {
    const { el, onCommit } = setup();
    pointer(el, 'pointerdown', { clientY: 100 });
    pointer(el, 'pointermove', { clientY: 80, buttons: 1 });
    expect(onCommit).toHaveBeenLastCalledWith(20);
    pointer(el, 'pointermove', { clientY: 130, buttons: 1 });
    expect(onCommit).toHaveBeenLastCalledWith(0); // clamped
    pointer(el, 'pointerup', { clientY: 130 });
  });

  it('moves under the threshold change nothing, and the click that ends a drag does not open the editor', () => {
    const { el, onCommit } = setup();
    pointer(el, 'pointerdown', { clientY: 100 });
    pointer(el, 'pointermove', { clientY: 98, buttons: 1 });
    expect(onCommit).not.toHaveBeenCalled();
    pointer(el, 'pointermove', { clientY: 90, buttons: 1 });
    pointer(el, 'pointerup', { clientY: 90 });
    el.click();
    expect(document.querySelector('.ctrl-readout-input')).toBeFalsy();
  });

  it('a click without a drag opens the editor', () => {
    const { el } = setup();
    pointer(el, 'pointerdown');
    pointer(el, 'pointerup');
    el.click();
    const input = document.querySelector('.ctrl-readout-input');
    expect(input).toBeTruthy();
    input.dispatchEvent(new window.Event('blur'));
  });

  it('respects step (2 ms Delay Time)', () => {
    const onCommit = vi.fn();
    const r = buildReadout(100, 0, 450, onCommit, { step: 2, dragPxPerUnit: 1 });
    pointer(r.el, 'pointerdown', { clientY: 100 });
    pointer(r.el, 'pointermove', { clientY: 90, buttons: 1 }); // 10 px at 1 px/unit = +10, a whole number of 2-steps
    expect(onCommit).toHaveBeenLastCalledWith(110);
  });

  it('drag: false keeps click-only behaviour', () => {
    const onCommit = vi.fn();
    const r = buildReadout(10, 0, 99, onCommit, { drag: false });
    pointer(r.el, 'pointerdown', { clientY: 100 });
    pointer(r.el, 'pointermove', { clientY: 60, buttons: 1 });
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('an open number editor ends on a press elsewhere (Archive #223)', () => {
  it('pressing another knob commits and closes the editor, so typing no longer reaches it', () => {
    const onA = vi.fn();
    const a = knobUnidirectional({ min: 0, max: 99, value: 10, readoutMode: 'beside' }, onA);
    const b = knobUnidirectional({ min: 0, max: 99, value: 50, readoutMode: 'beside' }, vi.fn());
    document.body.append(a, b);
    a.querySelector('.ctrl-readout').click();
    const input = a.querySelector('.ctrl-readout-input');
    expect(document.activeElement).toBe(input);
    input.value = '33';
    // The knob ring's pointerdown calls preventDefault, which stops the
    // browser's own focus change — the editor must still close.
    b.querySelector('.ctrl-knob').dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0 }));
    expect(a.querySelector('.ctrl-readout-input')).toBeFalsy();
    expect(onA).toHaveBeenLastCalledWith(33);
    document.body.innerHTML = '';
  });

  it('a press inside the editor keeps it open', () => {
    const a = knobUnidirectional({ min: 0, max: 99, value: 10, readoutMode: 'beside' }, vi.fn());
    document.body.append(a);
    a.querySelector('.ctrl-readout').click();
    const input = a.querySelector('.ctrl-readout-input');
    input.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0 }));
    expect(a.querySelector('.ctrl-readout-input')).toBe(input);
    input.dispatchEvent(new window.Event('blur'));
    document.body.innerHTML = '';
  });

  it('beginPointerDrag takes focus from any focused text field', () => {
    const field = document.createElement('input');
    const handle = document.createElement('span');
    document.body.append(field, handle);
    field.focus();
    expect(document.activeElement).toBe(field);
    const e = new window.PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0 });
    beginPointerDrag(e, handle, () => {});
    expect(document.activeElement).not.toBe(field);
    document.body.innerHTML = '';
  });
});
