// <nazoru-map>: framework-agnostic, light-DOM map search widget. The host server-renders the
// markup; this element adds behaviour. Maps JS loads only once the widget is visible and the
// browser is idle, or on first interaction, so indexable pages stay fast.
import type { MapEngine, MapHost } from './engine';

const whenIdle = (fn: () => void) =>
  'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200);

export class NazoruMap extends HTMLElement implements MapHost {
  #engine?: Promise<MapEngine | null>;
  #observer?: IntersectionObserver;

  connectedCallback() {
    for (const el of this.querySelectorAll<HTMLElement>('[data-enhanced]')) el.hidden = false;
    this.querySelector('[data-nojs]')?.remove();

    const start = () => void this.engine();
    this.addEventListener('pointerdown', start, { once: true });
    this.addEventListener('focusin', start, { once: true });
    this.#observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      this.#observer?.disconnect();
      whenIdle(start);
    });
    this.#observer.observe(this.querySelector('[data-map-canvas]') ?? this);

    this.addEventListener('click', (event) => {
      const action = (event.target as Element).closest<HTMLButtonElement>('button[data-action]')?.dataset.action;
      if (action) void this.engine().then((engine) => engine?.action(action));
    });
    document.addEventListener('search:results', this.#onResults);
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    document.removeEventListener('search:results', this.#onResults);
  }

  /** The host page searched (form, Back, or this map): show that area if the map is loaded. */
  #onResults = (event: Event) => {
    const { query } = (event as CustomEvent<{ query: string }>).detail;
    this.dataset.area = query;
    void this.#engine?.then((engine) => engine?.setArea(query, { fit: !query.startsWith('area=bounds') }));
  };

  engine(): Promise<MapEngine | null> {
    this.#engine ??= import('./engine')
      .then(({ createEngine }) => createEngine(this))
      .catch((error: unknown) => {
        console.error(error);
        this.dataset.state = 'error';
        this.setStatus('地図を読み込めませんでした。駅・区・距離の条件から探すか、ページを再読み込みしてください。');
        return null;
      });
    return this.#engine;
  }

  setStatus(text: string) {
    const el = this.querySelector('[data-map-status]');
    if (el) el.textContent = text;
  }
}

if (!customElements.get('nazoru-map')) customElements.define('nazoru-map', NazoruMap);
