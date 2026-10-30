// Progressive enhancement for /nagoya/search/: forms, pagination and Back/Forward update the
// results region in place (same server-rendered HTML as the full page), then announce once.
import { announceResults } from '../core/area/summary';

const ANNOUNCE_DEBOUNCE_MS = 400;
const GENERIC_ERROR = '検索できませんでした。時間をおいてもう一度お試しください。';

let announceTimer: ReturnType<typeof setTimeout> | undefined;
let inflight: AbortController | undefined;

/** Writes to the page's single polite status region, after results settle. */
export function announce(text: string) {
  const region = document.getElementById('announcer');
  if (!region) return;
  clearTimeout(announceTimer);
  region.textContent = '';
  announceTimer = setTimeout(() => (region.textContent = text), ANNOUNCE_DEBOUNCE_MS);
}

/** Visible, assertive error (role="alert" container is present from load). */
export function showError(message: string) {
  const el = document.getElementById('search-error');
  if (el) el.textContent = message;
}

interface LoadOptions {
  push?: boolean;
  announce?: boolean;
  focusResults?: boolean;
}

export async function loadArea(query: string, opts: LoadOptions = {}): Promise<boolean> {
  const slot = document.getElementById('results-slot');
  if (!slot) return false;
  inflight?.abort();
  const ctrl = (inflight = new AbortController());
  slot.setAttribute('aria-busy', 'true');
  try {
    const res = await fetch(`/nagoya/search/results/?${query}`, { signal: ctrl.signal });
    const tpl = document.createElement('template');
    tpl.innerHTML = await res.text();
    const section = tpl.content.getElementById('results');
    if (!res.ok || !section) {
      showError(tpl.content.querySelector('[data-search-error]')?.textContent || GENERIC_ERROR);
      return false;
    }
    showError('');
    slot.replaceChildren(section);
    const { summary = '', total = '0', title } = section.dataset;
    if (title) document.title = title;
    if (opts.push !== false) history.pushState({ query }, '', `/nagoya/search/?${query}`);
    if (opts.focusResults) section.querySelector<HTMLElement>('#results-heading')?.focus();
    if (opts.announce !== false) announce(announceResults(summary, Number(total)));
    document.dispatchEvent(new CustomEvent('search:results', { detail: { query, total: Number(total) } }));
    return true;
  } catch (e) {
    if ((e as Error).name !== 'AbortError') showError(GENERIC_ERROR);
    return false;
  } finally {
    if (inflight === ctrl) slot.removeAttribute('aria-busy');
  }
}

function queryFromForm(form: HTMLFormElement): string {
  const params = new URLSearchParams();
  for (const [key, value] of new FormData(form)) if (typeof value === 'string') params.append(key, value);
  return params.toString();
}

export function initSearchController() {
  history.replaceState({ query: location.search.slice(1) }, '');

  for (const form of document.querySelectorAll<HTMLFormElement>('form[action="/nagoya/search/"]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void loadArea(queryFromForm(form));
    });
  }

  document.getElementById('results-slot')?.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('nav a[href]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void loadArea(new URL(link.href).search.slice(1), { focusResults: true, announce: false });
  });

  window.addEventListener('popstate', () => void loadArea(location.search.slice(1), { push: false }));

  // Map widget (or any other producer) can request an area search.
  document.addEventListener('area-change', (event) => {
    const { query } = (event as CustomEvent<{ query: string }>).detail;
    void loadArea(query);
  });
}
