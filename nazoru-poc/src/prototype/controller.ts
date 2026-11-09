import type { Filters, PinsResponse, Scope, StorePage, Viewport } from './catalog';
import { DEFAULT_CONFIG, PRESETS, readConfig, writeConfig, type LabConfig } from './config';
import { fetchStores, queryFor, wasAborted } from './api';
import { parseRequest, parseScope, scopeLabel, scopeQuery } from './search';
import { storeCards } from './cards';
import { createSelection } from './selection';
import type { Camera, LabMap } from './map';

const host = document.querySelector<HTMLElement>('[data-lab]');
if (host) initialize(host);

function initialize(host: HTMLElement) {
  const $ = <T extends Element = HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  const state = JSON.parse($('[data-lab-bootstrap]').textContent!) as { scope: Scope; filters: Filters; config: LabConfig; result: StorePage };
  let config = state.config;
  let engine: LabMap | undefined;
  let mapPromise: Promise<void> | undefined;
  let currentCamera: Camera | null = null;
  const initialCamera = new URLSearchParams(location.search).get('camera');
  let lastPinViewport: Viewport | null = null;
  let mapTimer: ReturnType<typeof setTimeout>;
  let announcementTimer: ReturnType<typeof setTimeout>;
  let resultController: AbortController | undefined;
  let pinController: AbortController | undefined;
  let resultGeneration = 0;
  let pinGeneration = 0;
  let pendingAutoSearch = false;
  const form = $<HTMLFormElement>('[data-filters]');
  const selection = createSelection(host, { query: () => queryFor(state.scope, state.filters), config: () => config, map: () => engine });

  function announce(text: string) {
    clearTimeout(announcementTimer); $('[data-announcer]').textContent = text;
    announcementTimer = setTimeout(() => { $('[data-announcer]').textContent = ''; }, 5000);
  }
  function error(text: string) { $('[data-error]').textContent = text; }
  const viewportString = (v: Viewport) => [v.sw.lat, v.sw.lng, v.ne.lat, v.ne.lng].map(n => n.toFixed(5)).join(',');

  function saveUrl(push = false) {
    const params = writeConfig(queryFor(state.scope, state.filters), config);
    if (state.result.page > 1) params.set('page', String(state.result.page));
    if (currentCamera) params.set('camera', [currentCamera.lat.toFixed(6), currentCamera.lng.toFixed(6), currentCamera.zoom.toFixed(2)].join(','));
    const url = `/nagoya/map-lab/?${params}`;
    if (location.pathname + location.search !== url) history[push ? 'pushState' : 'replaceState'](null, '', url);
  }

  function syncFilters() {
    form.querySelector<HTMLSelectElement>('[name="category"]')!.value = state.filters.category;
    form.querySelectorAll<HTMLInputElement>('[name="pref"]').forEach(input => { input.checked = state.filters.preferences.includes(input.value); });
    form.querySelectorAll<HTMLInputElement>('[name="district"]').forEach(input => { input.checked = state.scope.kind === 'districts' && state.scope.ids.includes(input.value); });
  }

  function renderResults() {
    const result = state.result;
    $('[data-results-count]').textContent = String(result.total);
    $('[data-results-scope]').textContent = scopeLabel(state.scope);
    $('[data-result-cards]').innerHTML = storeCards(result.items);
    $('[data-results-empty]').hidden = result.total > 0;
    $('[data-page-label]').textContent = `${result.page} / ${result.pageCount} ページ`;
    $<HTMLButtonElement>('[data-list-prev]').disabled = result.page <= 1;
    $<HTMLButtonElement>('[data-list-next]').disabled = result.page >= result.pageCount;
  }

  async function refreshPins(discover = true) {
    const viewport = discover ? engine?.viewport() : lastPinViewport ?? engine?.viewport();
    if (!engine || !viewport || !config.mapOpen) return;
    pinController?.abort(); pinController = new AbortController();
    const token = ++pinGeneration;
    const params = queryFor(state.scope, state.filters);
    params.set('view', 'pins'); params.set('viewport', viewportString(viewport));
    host.dataset.pinState = 'loading';
    try {
      const data = await fetchStores<PinsResponse>(params, pinController.signal);
      if (token !== pinGeneration || !config.mapOpen) return;
      lastPinViewport = viewport; engine.setPins(data.pins);
      const count = data.pins.filter(p => config.showContext || p.inResults).length;
      $('[data-pin-status]').textContent = `${count}店舗のピンを表示`;
      $('[data-map-empty]').hidden = count > 0;
      host.dataset.pinState = 'ready';
    } catch (e) {
      if (!wasAborted(e) && token === pinGeneration) { host.dataset.pinState = 'error'; error('ピンを更新できませんでした。検索ボタンで再試行してください。'); }
    }
  }

  async function loadResults(scope: Scope, filters = state.filters, page = 1, options: { fit?: boolean; push?: boolean; automatic?: boolean } = {}) {
    resultController?.abort(); resultController = new AbortController();
    const token = ++resultGeneration;
    pendingAutoSearch = options.automatic ?? false;
    const params = queryFor(scope, filters); params.set('page', String(page));
    host.dataset.listState = 'loading'; $('[data-results]').setAttribute('aria-busy', 'true');
    try {
      const data = await fetchStores<StorePage>(params, resultController.signal);
      if (token !== resultGeneration) return;
      selection.close(false); state.scope = scope; state.filters = filters; state.result = data;
      error(''); renderResults(); syncFilters(); engine?.setScope(scope);
      if (options.fit && data.fitBounds && engine) await engine.fit(data.fitBounds);
      if (token !== resultGeneration) return;
      if (engine) currentCamera = engine.camera();
      $<HTMLButtonElement>('[data-action="search-bounds"]').dataset.dirty = 'false';
      saveUrl(options.push ?? true);
      void refreshPins(!options.automatic || config.pinRefresh === 'auto');
      announce(`${scopeLabel(scope)}のお店は${data.total}件です。`);
    } catch (e) { if (!wasAborted(e) && token === resultGeneration) { error((e as Error).message); syncFilters(); } }
    finally { if (token === resultGeneration) { host.dataset.listState = 'ready'; $('[data-results]').removeAttribute('aria-busy'); pendingAutoSearch = false; } }
  }

  function onMapIdle(viewport: Viewport, camera: Camera, programmatic: boolean) {
    currentCamera = camera;
    host.dataset.camera = [camera.lat.toFixed(6), camera.lng.toFixed(6), camera.zoom.toFixed(2)].join(',');
    if (!config.mapOpen) return;
    clearTimeout(mapTimer); saveUrl();
    if (!programmatic) { selection.close(false); $<HTMLButtonElement>('[data-action="search-bounds"]').dataset.dirty = 'true'; }
    mapTimer = setTimeout(() => {
      if (!config.mapOpen) return;
      if (config.pinRefresh === 'auto') void refreshPins();
      const waitingForUserSearch = host.dataset.listState === 'loading' && !pendingAutoSearch;
      if (config.listRefresh === 'auto' && !programmatic && !waitingForUserSearch) void loadResults({ kind: 'bounds', ...viewport }, state.filters, 1, { automatic: true, push: false });
    }, 250);
  }

  async function ensureMap() {
    if (engine) { engine.render(); void refreshPins(config.pinRefresh === 'auto'); return; }
    if (mapPromise) return mapPromise;
    mapPromise = (async () => {
      host.dataset.mapState = 'loading'; $('[data-map-loading]').hidden = false;
      try {
        const { createLabMap, parseCamera } = await import('./map');
        engine = await createLabMap(host, config, {
          onMove: () => clearTimeout(mapTimer),
          onIdle: onMapIdle, onSelect: group => selection.open(group), announce,
          onArea: query => { void loadResults(parseScope(query)); },
        });
        engine.setScope(state.scope);
        const restored = parseCamera(initialCamera);
        if (restored) await engine.restore(restored);
        else if (state.result.fitBounds) await engine.fit(state.result.fitBounds);
        host.dataset.mapState = 'ready'; $('[data-map-loading]').hidden = true;
        $<HTMLButtonElement>('[data-action="search-bounds"]').disabled = false;
        currentCamera = engine.camera();
        host.dataset.camera = [currentCamera.lat.toFixed(6), currentCamera.lng.toFixed(6), currentCamera.zoom.toFixed(2)].join(',');
        await refreshPins(); saveUrl();
      } catch (e) {
        host.dataset.mapState = 'error'; $('[data-map-loading]').hidden = true; mapPromise = undefined;
        error('地図を読み込めませんでした。閉じてから再度開くと再試行できます。店舗一覧は引き続き利用できます。');
        console.error('Map prototype failed to load', e);
      }
    })();
    return mapPromise;
  }

  function applyConfig() {
    for (const input of host.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-config]')) {
      const value = config[input.dataset.config as keyof LabConfig];
      if (input instanceof HTMLInputElement) input.checked = Boolean(value); else input.value = String(value);
    }
    const presetKey = Object.keys(PRESETS).find(key => Object.keys(config).every(k => k === 'mapOpen' || config[k as keyof LabConfig] === PRESETS[key].config[k as keyof LabConfig]));
    host.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === presetKey)));
    $('[data-config-summary]').textContent = `${presetKey ? PRESETS[presetKey].label : 'カスタム'} · ピン${config.pinRefresh === 'auto' ? '自動' : 'ボタン'} / 一覧${config.listRefresh === 'auto' ? '自動' : 'ボタン'}`;
    $('[data-results-note]').textContent = config.listRefresh === 'manual' ? '地図を動かしても、この一覧は変わりません。' : '地図の移動が止まると、表示エリアの店舗一覧に更新します。';
    $('[data-map-description]').textContent = config.listRefresh === 'manual'
      ? config.pinRefresh === 'auto' ? '地図を動かして周辺をチェック。一覧の更新はボタンから。' : 'ピンと一覧の更新は検索ボタンから。'
      : config.pinRefresh === 'auto' ? '地図を動かすと、ピンと一覧を自動更新します。' : '地図を動かすと一覧を自動更新。ピンは検索ボタンで更新。';
    $('[data-radius-tool]').hidden = !config.radius; $('[data-drawing-tools]').hidden = !config.trace;
    $('[data-context-legend]').hidden = !config.showContext;
    $('[data-map-frame]').dataset.height = config.mapHeight;
    $('#lab-map-body').hidden = !config.mapOpen;
    $('[data-map-toggle]').setAttribute('aria-expanded', String(config.mapOpen));
    $('[data-map-toggle]').textContent = config.mapOpen ? '地図を閉じる' : '地図を開く';
    engine?.setConfig(config);
    if (config.mapOpen) void ensureMap();
    else {
      clearTimeout(mapTimer); pinController?.abort(); ++pinGeneration; selection.close(false); engine?.cancelDrawing();
      if (pendingAutoSearch) { resultController?.abort(); ++resultGeneration; pendingAutoSearch = false; host.dataset.listState = 'ready'; $('[data-results]').removeAttribute('aria-busy'); }
    }
    saveUrl();
  }

  form.addEventListener('change', event => {
    const changed = event.target as HTMLInputElement;
    const data = new FormData(form);
    const filters = { category: String(data.get('category')), preferences: data.getAll('pref').map(String) };
    const ids = data.getAll('district').map(String);
    if (changed.name === 'district' && !ids.length) { changed.checked = true; error('エリアを1つ以上選んでください。'); return; }
    // Read pending choices from the form, so a second change cannot discard an in-flight area change.
    const scope: Scope = ids.length ? { kind: 'districts', ids } : state.scope;
    engine?.cancelDrawing(); void loadResults(scope, filters, 1, { fit: scopeQuery(scope) !== scopeQuery(state.scope) });
  });
  form.addEventListener('submit', event => { event.preventDefault(); const data = new FormData(form); const ids = data.getAll('district').map(String); void loadResults(ids.length ? { kind: 'districts', ids } : state.scope, { category: String(data.get('category')), preferences: data.getAll('pref').map(String) }); });
  $('[data-map-toggle]').addEventListener('click', () => { config = { ...config, mapOpen: !config.mapOpen }; applyConfig(); });
  host.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-config]').forEach(input => input.addEventListener('change', () => {
    selection.close(false);
    const key = input.dataset.config as keyof LabConfig;
    config = { ...config, [key]: input instanceof HTMLInputElement ? input.checked : input.value };
    applyConfig();
  }));
  host.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.addEventListener('click', () => { selection.close(false); config = { ...PRESETS[button.dataset.preset!].config }; applyConfig(); }));
  $('[data-reset]').addEventListener('click', () => { selection.close(false); config = { ...DEFAULT_CONFIG }; applyConfig(); announce('設定を標準に戻しました。'); });
  $('[data-share]').addEventListener('click', async () => {
    saveUrl();
    try { await navigator.clipboard.writeText(location.href); announce('この組み合わせのURLをコピーしました。'); }
    catch { $('[data-share-fallback]').hidden = false; const input = $<HTMLInputElement>('[data-share-url]'); input.value = location.href; input.focus(); input.select(); }
  });
  $('[data-list-prev]').addEventListener('click', () => void loadResults(state.scope, state.filters, state.result.page - 1));
  $('[data-list-next]').addEventListener('click', () => void loadResults(state.scope, state.filters, state.result.page + 1));
  host.addEventListener('click', async event => {
    const action = (event.target as Element).closest<HTMLButtonElement>('[data-action]')?.dataset.action;
    if (!action || !engine) return;
    if (action === 'search-bounds') { engine.cancelDrawing(); const viewport = engine.viewport(); if (viewport) void loadResults({ kind: 'bounds', ...viewport }); }
    else if (action === 'radius') {
      engine.cancelDrawing();
      const radiusM = Number($<HTMLSelectElement>('[data-radius]').value) as 500 | 1000 | 2000;
      const origin = $<HTMLSelectElement>('[data-radius-origin]').value;
      try {
        const center = origin === 'here' ? await new Promise<{ lat: number; lng: number }>((resolve, reject) => navigator.geolocation.getCurrentPosition(p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), reject, { timeout: 10000 })) : engine.map.getCenter()!.toJSON();
        void loadResults({ kind: 'radius', center, radiusM, origin }, state.filters, 1, { fit: true });
      } catch { error('現在地を取得できませんでした。位置情報の許可を確認するか、地図の中心を選んでください。'); }
    } else engine.action(action);
  });
  window.addEventListener('popstate', async () => {
    try {
      const params = new URLSearchParams(location.search); const next = parseRequest(params);
      config = readConfig(params); applyConfig();
      await loadResults(next.scope, next.filters, next.page, { push: false });
      const { parseCamera } = await import('./map'); const camera = parseCamera(params.get('camera'));
      if (camera && engine) { await engine.restore(camera); void refreshPins(); }
    } catch (e) { error((e as Error).message); }
  });
  applyConfig();
}
