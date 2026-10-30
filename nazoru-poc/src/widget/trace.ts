// Trace mode (なぞる): draw a closed area with one finger or the mouse. While active the map's own
// gestures are off ('none') and a transparent touch-action:none overlay captures the stroke in
// screen space; it is converted to lat/lng once, on release. The crosshair mode is the non-drag
// equivalent (WCAG 2.5.1 / 2.5.7).
import { serializeArea } from '../core/area/model';
import { validatePolygon } from '../core/area/validate';
import { closeLoop, simplifyPath, type Pt } from '../core/geo/stroke';
import type { Mode, ModeContext } from './modes';

const MIN_STEP_PX = 6;
const SIMPLIFY_PX = 2;
const MAX_VERTICES = 100;

export function createTrace(ctx: ModeContext): Mode {
  const { host } = ctx;
  const toggle = host.querySelector<HTMLButtonElement>('[data-action="trace"]')!;
  const controls = host.querySelector<HTMLElement>('[data-trace-controls]')!;
  const overlay = host.querySelector<HTMLElement>('[data-trace-overlay]')!;
  const lines = overlay.querySelectorAll<SVGPolylineElement>('polyline');

  let active = false;
  let pointerId: number | null = null;
  let points: Pt[] = [];

  const draw = (pts: Pt[]) => lines.forEach((l) => l.setAttribute('points', pts.map((p) => `${p.x},${p.y}`).join(' ')));
  const local = (e: PointerEvent): Pt => {
    const rect = overlay.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  function abortStroke(message?: string) {
    if (pointerId !== null && overlay.hasPointerCapture(pointerId)) overlay.releasePointerCapture(pointerId);
    pointerId = null;
    points = [];
    draw([]);
    if (message) ctx.announce(message);
  }

  function setActive(on: boolean) {
    active = on;
    toggle.setAttribute('aria-pressed', String(on));
    controls.hidden = !on;
    overlay.hidden = !on;
    ctx.setGestures(on ? 'none' : null);
    ctx.setMarkersVisible(!on);
    if (on) document.addEventListener('keydown', onKeydown);
    else document.removeEventListener('keydown', onKeydown);
  }

  function start() {
    ctx.stopOtherModes(mode);
    ctx.showError('');
    setActive(true);
    ctx.announce('なぞるモードを開始しました。地図の上を指でなぞって範囲を囲み、指を離すと検索します。Escキーでキャンセルできます。');
  }

  function cancel({ silent = false } = {}) {
    if (!active) return;
    abortStroke();
    setActive(false);
    ctx.showError('');
    if (silent) return;
    toggle.focus();
    ctx.announce('なぞるモードを終了しました。');
  }

  function finish(e: PointerEvent) {
    const rect = overlay.getBoundingClientRect();
    const releasedOutside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
    const stroke = points;
    abortStroke();
    if (releasedOutside) {
      ctx.showError('地図の外で指を離したため、範囲を取り消しました。');
      return;
    }
    let ring = closeLoop(stroke);
    for (let tolerance = SIMPLIFY_PX; ; tolerance *= 1.5) {
      const simplified = simplifyPath(ring, tolerance);
      if (simplified.length <= MAX_VERTICES) {
        ring = simplified;
        break;
      }
    }
    const result = validatePolygon(ring.map((p) => ctx.toLatLng(p.x, p.y)));
    if (!result.ok) {
      ctx.showError(result.error);
      return;
    }
    ctx.showError('');
    setActive(false);
    ctx.requestArea(serializeArea({ kind: 'polygon', ring: result.ring, source: 'trace' }));
  }

  overlay.addEventListener('pointerdown', (e) => {
    if (!active) return;
    if (!e.isPrimary || pointerId !== null) {
      abortStroke('2本目の指を検知したため、なぞりを中断しました。'); // pinch attempt: stop, don't guess
      return;
    }
    e.preventDefault();
    pointerId = e.pointerId;
    overlay.setPointerCapture(e.pointerId);
    points = [local(e)];
    ctx.showError('');
    draw(points);
  });

  overlay.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pointerId) return;
    const p = local(e);
    const last = points[points.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_STEP_PX) return; // tremor tolerance + fewer points
    points.push(p);
    draw(points);
  });

  overlay.addEventListener('pointerup', (e) => {
    if (e.pointerId === pointerId) finish(e);
  });
  overlay.addEventListener('pointercancel', (e) => {
    if (e.pointerId === pointerId) abortStroke('なぞりを中断しました。');
  });

  function onKeydown(event: KeyboardEvent) {
    if (!active || event.key !== 'Escape') return;
    event.preventDefault();
    if (pointerId !== null) abortStroke('なぞりを中断しました。');
    else cancel();
  }

  function action(name: string): boolean {
    if (name === 'trace') {
      if (active) cancel();
      else start();
      return true;
    }
    if (active && name === 'cancel') {
      cancel();
      return true;
    }
    return false;
  }

  const mode: Mode = {
    get active() {
      return active;
    },
    start,
    cancel,
    action,
    onKeydown: () => {}, // trace listens on document while active (focus may leave the widget)
  };
  return mode;
}
