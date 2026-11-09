import { districtName, categoryName, preferenceName, type DemoStore } from './catalog';

const escape = (value: string | number) => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function storeCard(store: DemoStore): string {
  return `<article class="store-card" data-store-id="${escape(store.id)}">
    <div class="store-art" aria-hidden="true"><span>${escape(store.name.slice(0, 1))}</span><small>SAMPLE</small></div>
    <div class="store-content"><p class="store-eyebrow">${escape(districtName(store.districtId))} · ${escape(categoryName(store.category))}</p>
    <h3><a href="/nagoya/map-lab/stores/${encodeURIComponent(store.id)}/" target="_blank" rel="noopener">${escape(store.name)}<span class="sr-only">（店舗詳細・別タブ）</span><span aria-hidden="true"> ↗</span></a></h3>
    <p class="store-price"><span>目安予算</span> <strong>${store.price.toLocaleString('ja-JP')}<small>円〜</small></strong></p>
    <p class="store-building">${escape(store.building)}</p>
    <ul class="store-tags" aria-label="設備">${store.preferences.map(p => `<li>${escape(preferenceName(p))}</li>`).join('')}</ul></div>
  </article>`;
}

export const storeCards = (stores: DemoStore[]) => stores.map(storeCard).join('');
