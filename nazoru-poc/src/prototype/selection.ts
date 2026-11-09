import type { StorePage } from './catalog';
import type { LabConfig } from './config';
import type { PinGroup } from './clusters';
import type { LabMap } from './map';
import { fetchStores, wasAborted } from './api';
import { storeCards } from './cards';

interface Context { query(): URLSearchParams; config(): LabConfig; map(): LabMap | undefined }

export function createSelection(host: HTMLElement, context: Context) {
  const dialog = host.querySelector<HTMLDialogElement>('[data-selection]')!;
  const cards = host.querySelector<HTMLElement>('[data-selection-cards]')!;
  const more = host.querySelector<HTMLButtonElement>('[data-selection-more]')!;
  const error = host.querySelector<HTMLElement>('[data-selection-error]')!;
  let controller: AbortController | undefined;
  let generation = 0;
  let ids: string[] = [];
  let page = 0;
  let restoreFocus = true;

  async function load(append: boolean) {
    controller?.abort();
    controller = new AbortController();
    const token = ++generation;
    const params = context.query();
    params.set('view', 'selection'); params.set('ids', ids.join(',')); params.set('page', String(append ? page + 1 : 1));
    more.disabled = true; dialog.setAttribute('aria-busy', 'true'); error.textContent = '';
    try {
      const data = await fetchStores<StorePage>(params, controller.signal);
      if (token !== generation || !dialog.open) return;
      if (append) cards.insertAdjacentHTML('beforeend', storeCards(data.items));
      else cards.innerHTML = storeCards(data.items);
      page = data.page;
      host.querySelector('[data-selection-title]')!.textContent = `この場所のお店（${data.total}件）`;
      host.querySelector('[data-selection-caption]')!.textContent = `このピンに含まれる店舗のみ表示しています。${Math.min(data.page * 12, data.total)} / ${data.total}件`;
      more.hidden = page >= data.pageCount;
    } catch (e) { if (!wasAborted(e) && token === generation) error.textContent = (e as Error).message; }
    finally { if (token === generation) { more.disabled = false; dialog.removeAttribute('aria-busy'); } }
  }

  function close(focus = true) {
    if (!dialog.open) return;
    restoreFocus = focus; ++generation; controller?.abort(); dialog.close();
  }
  dialog.addEventListener('close', () => {
    context.map()?.select([]);
    if (restoreFocus) context.map()?.restoreSelectionFocus(ids);
    ids = [];
  });
  dialog.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
  dialog.addEventListener('click', e => {
    const bounds = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom)) close();
  });
  host.querySelector('[data-selection-close]')!.addEventListener('click', () => close());
  more.addEventListener('click', () => void load(true));
  return {
    close,
    open: (group: PinGroup) => {
      controller?.abort();
      ids = group.ids; page = 0; restoreFocus = true;
      context.map()?.select(ids);
      cards.replaceChildren(); more.hidden = true; error.textContent = '';
      host.querySelector('[data-selection-title]')!.textContent = `この場所のお店（${ids.length}件）`;
      host.querySelector('[data-selection-caption]')!.textContent = '店舗情報を読み込んでいます…';
      host.querySelector('[data-selection-scroll]')!.scrollTop = 0;
      dialog.dataset.presentation = context.config().pinAction === 'preview' ? 'preview' : 'sheet';
      if (!dialog.open) {
        if (dialog.dataset.presentation === 'preview') dialog.show(); else dialog.showModal();
      }
      host.querySelector<HTMLButtonElement>('[data-selection-close]')!.focus();
      void load(false);
    },
  };
}
