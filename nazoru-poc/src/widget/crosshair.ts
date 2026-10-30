// Crosshair polygon mode: the keyboard, voice-control and switch-access route to drawing an area.
// Pan the map (arrow keys or the visible pan pad), then add the vertex under the fixed centre
// crosshair (Enter or 「頂点を追加」). No dragging anywhere (WCAG 2.1.1, 2.5.1, 2.5.7).
import { distanceM } from '../core/area/filter';
import { serializeArea } from '../core/area/model';
import { validatePolygon } from '../core/area/validate';
import type { Mode, ModeContext } from './modes';
import { drawDraft } from './overlay';

const PAN_PX = 120;
const SAME_SPOT_M = 5;
const PAN: Record<string, [number, number]> = {
  'pan-up': [0, -1],
  'pan-down': [0, 1],
  'pan-left': [-1, 0],
  'pan-right': [1, 0],
};

export function createCrosshair(ctx: ModeContext): Mode {
  const { host, map } = ctx;
  const toggle = host.querySelector<HTMLButtonElement>('[data-action="crosshair"]')!;
  const controls = host.querySelector<HTMLElement>('[data-crosshair-controls]')!;
  const reticle = host.querySelector<HTMLElement>('[data-crosshair]')!;
  const vertexStatus = host.querySelector<HTMLElement>('[data-vertex-status]')!;

  let active = false;
  let vertices: google.maps.LatLngLiteral[] = [];
  let draft: ReturnType<typeof drawDraft> | undefined;
  let centerListener: google.maps.MapsEventListener | undefined;

  const center = () => map.getCenter()!.toJSON();

  function redraw() {
    // Rubber band: placed vertices, then the crosshair, then back to the start once it can close.
    const path = [...vertices, center()];
    if (vertices.length >= 2) path.push(vertices[0]);
    draft?.setPath(path);
    vertexStatus.textContent = `頂点：${vertices.length}点`;
  }

  function setActive(on: boolean) {
    active = on;
    toggle.setAttribute('aria-pressed', String(on));
    controls.hidden = !on;
    reticle.hidden = !on;
    ctx.setMarkersVisible(!on); // so arrow keys pan instead of cycling through markers
    if (on) {
      draft = drawDraft(map);
      centerListener = map.addListener('center_changed', redraw);
    } else {
      draft?.remove();
      centerListener?.remove();
      draft = undefined;
    }
  }

  function start() {
    ctx.stopOtherModes(mode);
    vertices = [];
    ctx.showError('');
    setActive(true);
    redraw();
    ctx.focusMap();
    ctx.announce('十字で範囲指定を開始しました。地図を動かし、中心の十字の位置に頂点を追加してください。');
  }

  function cancel({ silent = false } = {}) {
    if (!active) return;
    setActive(false);
    ctx.showError('');
    if (silent) return;
    toggle.focus();
    ctx.announce('範囲指定をキャンセルしました。');
  }

  function add() {
    const c = center();
    const last = vertices.at(-1);
    if (last && distanceM(last, c) < SAME_SPOT_M) {
      ctx.announce('同じ位置には追加できません。地図を動かしてから追加してください。');
      return;
    }
    vertices.push(c);
    ctx.showError('');
    redraw();
    const n = vertices.length;
    ctx.announce(n >= 3 ? `頂点${n}を追加しました。「完了」で範囲を確定できます。` : `頂点${n}を追加しました。あと${3 - n}点必要です。`);
  }

  function undo() {
    if (vertices.length === 0) {
      ctx.announce('取り消す頂点はありません。');
      return;
    }
    vertices.pop();
    redraw();
    ctx.announce(`頂点を1つ取り消しました。残り${vertices.length}点です。`);
  }

  function finish() {
    const result = validatePolygon(vertices);
    if (!result.ok) {
      ctx.showError(result.error);
      return;
    }
    setActive(false);
    ctx.showError('');
    toggle.focus();
    ctx.requestArea(serializeArea({ kind: 'polygon', ring: result.ring, source: 'crosshair' }));
  }

  function action(name: string): boolean {
    if (name === 'crosshair') {
      if (active) cancel();
      else start();
      return true;
    }
    if (!active) return false;
    if (name in PAN) {
      const [dx, dy] = PAN[name];
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const div = map.getDiv();
        map.setCenter(ctx.toLatLng(div.clientWidth / 2 + dx * PAN_PX, div.clientHeight / 2 + dy * PAN_PX)); // jump, no animation
      } else {
        map.panBy(dx * PAN_PX, dy * PAN_PX);
      }
    } else if (name === 'add-vertex') add();
    else if (name === 'undo-vertex') undo();
    else if (name === 'finish') finish();
    else if (name === 'cancel') cancel();
    else return false;
    return true;
  }

  function onKeydown(event: KeyboardEvent) {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }
    // Enter/Backspace/Undo only act on the map itself; real controls keep their own behaviour.
    const onMap = (event.target as Element).closest('[data-map-canvas]') && !(event.target as Element).closest('button, a, input, select, gmp-advanced-marker');
    if (!onMap) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z')) {
      event.preventDefault();
      undo();
    }
  }

  const mode: Mode = {
    get active() {
      return active;
    },
    start,
    cancel,
    action,
    onKeydown,
  };
  return mode;
}
