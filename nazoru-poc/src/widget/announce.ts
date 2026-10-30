const DEBOUNCE_MS = 400;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Writes to the host page's polite status region (id from data-announcer, default "announcer"). */
export function announce(host: HTMLElement, text: string) {
  const region = document.getElementById(host.dataset.announcer ?? 'announcer');
  if (!region) return;
  clearTimeout(timer);
  region.textContent = '';
  timer = setTimeout(() => (region.textContent = text), DEBOUNCE_MS);
}
