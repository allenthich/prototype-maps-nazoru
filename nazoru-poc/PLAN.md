# Plan: なぞる area search PoC

Implements `SPEC.md` (v2, approved 2026-10-30). Status: **approved 2026-10-30. Tasks 0–5 done (checkpoint); 6–9 pending.**

## Spike results (2026-10-30, Maps JS weekly, headless Chromium, keyless)

| Check | Result | Consequence |
|---|---|---|
| Keyless map, tiles, `tilesloaded` | Works; tiles darkened and watermarked "For development purposes only" | Dev and tests run **keyless by default**. The provided key in `.env` is optional |
| Keyless dialog 「このページでは Google マップが正しく読み込まれませんでした」 | Modal with an OK button | E2E helper dismisses it. axe scans exclude only that dialog, and only in keyless mode |
| `DEMO_MAP_ID` + `AdvancedMarkerElement` | Renders with `role="button"`; logs `ApiProjectMapError` keyless | Clusters are testable keyless |
| `OverlayView.getProjection().fromContainerPixelToLatLng` | Exact | The trace conversion approach is confirmed |
| Map region under `language=ja` | `role="region"`, `aria-label="マップ"`, `aria-roledescription="地図"`, `tabindex="0"` | Resolves the open question from the accessibility report |
| Arrow keys on the focused region | Pans, **including with `gestureHandling:'none'`** | Confirms the research. The pan step is small, so the pan pad uses `panBy(±120px)` |
| Built-in camera control | Has 上へ移動/左へ移動/右へ移動/下へ移動/ズームイン/ズームアウト buttons | Keep it on. Crosshair mode still adds its own visible pan pad next to the 頂点を追加 button, so a pointer user can do everything with single taps (2.5.7) |

## Components and order

The order is risk-first, in vertical slices. Each slice leaves `pnpm check`, unit and e2e tests green.

```
0 scaffold ─▶ 1 core area (TDD) ─▶ 2 data ─▶ 3 SEO pages ─▶ 4 no-JS search ─▶ 5 partial + controller
                                                                                      │
                                         9 polish ◀─ 8 trace ◀─ 7 crosshair ◀─ 6 map widget
```

Risks and mitigations:
- **Astro 7 is new** (Rust compiler, strict HTML). Mitigation: scaffold first and catch problems early; fall back to `astro@6` only if blocked.
- **Route caching is a no-op in dev.** Cache assertions run against `build` + `preview`, which is where Playwright runs.
- **Pointer tracing in headless Chromium.** Playwright mouse events produce `pointerType: "mouse"` PointerEvents. Touch is covered with a CDP touch-emulation case if time allows; otherwise it is documented as a manual check.
- **Swapping the list in place could lose focus.** The swap replaces only the inside of the results region, never a focused control. E2E asserts `document.activeElement` is unchanged.

## Tasks

- [x] **0. Scaffold**
  - Acceptance:
    - Astro 7 minimal TS project in `nazoru-poc/` with `@astrojs/node` standalone and `memoryCache()`
    - Vitest, Playwright (build + preview web server, keyless env) and `@axe-core/playwright` installed
    - `pnpm` scripts as in the spec
  - Verify: `pnpm check && pnpm build && pnpm test:unit && pnpm test:e2e` (one smoke test each)
  - Files: `package.json`, `astro.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`
- [x] **1. Core area model (test-first)**
  - Acceptance:
    - `SearchArea` URL round-trips for all five kinds
    - Encoded polyline round-trips
    - Validation returns Japanese messages for <3 vertices, self-crossing, too small (<0.05 km²) and too large (>30 km²)
    - Point-in-area is correct for every kind
    - Summary text, e.g. 「描いた範囲」「栄駅から半径1km」
  - Verify: `pnpm test:unit`
  - Files: `src/core/area/{model,validate,filter,summary}.ts`, `src/core/geo/polyline.ts`, tests
- [x] **2. Data**
  - Acceptance:
    - About 16 central-Nagoya stations with approximate coordinates and their ward; 5 wards
    - Seeded generator producing about 1,500 listings: id, name, rent, layout, m², walk minutes, nearest station, ward, lat/lng
    - Output is deterministic
  - Verify: unit test (stable count and first id; every listing has a valid station and ward)
  - Files: `src/data/{stations,wards,listings.server}.ts`, test
- [x] **3. SEO pages**
  - Acceptance:
    - `Layout` handles title, description, canonical, robots, OG and JSON-LD
    - `Breadcrumbs` (visible + BreadcrumbList)
    - Paginated `ResultList` with `<h2>` count and crawlable `?page=` links
    - Pages: `/` → `/nagoya/`, ward, station and listing pages
    - `/sitemap.xml`, `/robots.txt`
    - `routeRules` caching for ward, station and listing pages
  - Verify: e2e checks for meta tags, valid JSON-LD, sitemap URL count, zero JS on the listing page, cache hit on repeat request, and axe clean
  - Files: `src/components/{Layout,Breadcrumbs,ResultList}.astro`, `src/pages/**`
- [x] **4. No-JS search**
  - Acceptance:
    - `AreaForm`: ward and station checkboxes in `fieldset`/`legend`, counts inside labels, and a radius preset (station + 500 m/1 km/2 km)
    - `/nagoya/search/` renders the summary, count and list, with `noindex, follow`
    - Invalid params give a text error
  - Verify: e2e in a `javaScriptEnabled:false` project, plus axe
  - Files: `src/components/{AreaForm,AreaSummary}.astro`, `src/pages/nagoya/search/index.astro`
- [x] **5. Partial + page controller**
  - Acceptance:
    - `/nagoya/search/results` partial returns the results region plus a JSON point list for every in-area listing
    - `search-controller.ts`: enhanced form submit → fetch → swap → `pushState`; `popstate` restores
    - `Announcer`: one polite `role="status"` in the layout, debounced 400 ms
  - Verify: e2e (the list updates without navigation, focus stays put, the status text says 「…件」, Back restores the previous list)
  - Files: `src/pages/nagoya/search/results.astro`, `src/client/search-controller.ts`, `src/components/Announcer.astro`
- [ ] **6. Map widget base**
  - Acceptance:
    - `<nazoru-map>` light-DOM element
    - Lazy Maps load (IntersectionObserver + idle, or first interaction)
    - Reserved `aspect-ratio`
    - Keyless/no-key handling
    - Clusters (supercluster → `AdvancedMarkerElement`, `gmpClickable`, title 「N件の物件。選択すると拡大します」); activating zooms, refocuses the map and announces
    - Current area drawn with a two-tone outline
    - **このエリアで検索** button
    - Panning never searches
  - Verify: e2e (no `maps.googleapis.com` request before scrolling, cluster total = heading count, named cluster buttons, bounds search works)
  - Files: `src/widget/{nazoru-map,clusters,styles}.ts`, `src/components/MapWidget.astro`
- [ ] **7. Crosshair mode**
  - Acceptance:
    - 十字で範囲指定 toggle (`aria-pressed`) shows a CSS crosshair and the 頂点を追加/元に戻す/完了/キャンセル buttons plus a pan pad
    - Enter adds `map.getCenter()`; Backspace or Ctrl/Cmd+Z undoes; Esc cancels and refocuses the toggle
    - Dashed draft line
    - Announcements per vertex; completing emits `area-change`
  - Verify: the keyboard-only e2e script from the spec, a pointer-only (buttons) e2e, and axe in this mode
  - Files: `src/widget/crosshair.ts`, `MapWidget.astro`, `nazoru-map.ts`
- [ ] **8. Trace mode**
  - Acceptance:
    - なぞる toggle (`aria-pressed`) adds a transparent `touch-action:none` overlay and sets `gestureHandling:'none'` and `clickableIcons:false`
    - Pointer path with minimum-distance sampling, converted on pointerup, then simplify → close → validate
    - Esc or `pointercancel` aborts
    - Invalid shapes keep the previous area and raise an error alert
    - Gesture settings are restored afterwards
  - Verify: e2e for a drag loop → results, a figure-8 → error with the previous area kept, and Esc mid-stroke → nothing changes
  - Files: `src/widget/trace.ts`, `nazoru-map.ts`
- [ ] **9. Polish + docs**
  - Acceptance:
    - 44 px targets
    - forced-colors and reduced-motion styles
    - 320 px reflow (map/list toggle)
    - axe across every listed state
    - Media-emulation screenshots
    - README covering run steps, architecture, a11y and SEO decisions, the production path (PostGIS, CDN cache provider), known gaps and the manual test matrix
  - Verify: full `pnpm check && pnpm test:unit && pnpm test:e2e`
  - Files: CSS, `tests/e2e/*`, `README.md`

## Deviations so far (tasks 0–5)

- **TypeScript is pinned to 6.x.** `@astrojs/check` 0.9.12 supports TS 5/6 only, and npm `latest` is now 7.0.
- **Extra dependencies:**
  - `@turf/area` and `@turf/helpers`, for polygon area validation
  - `@types/node`, for typing the Playwright config
- **Map points are fetched by the widget**, not embedded in the partial. Points load only once the map loads, so ward and station pages don't carry about 15 KB of JSON for crawlers. Task 6 adds a `points.json` endpoint backed by the same `searchListings`, so the list and the clusters still agree.
- **Forms are named 駅を選んで探す / 区を選んで探す / 駅からの距離で探す.** This keeps them distinct from the indexable 「区から探す / 駅から探す」 link navigation.
- **The e2e server is the built Node server** (`exec node dist/server/entry.mjs`), started fresh every run. An orphaned `astro preview` had been serving a stale build.

## Verification checkpoints

- **After task 5:** the whole SEO and no-JS product works with no map at all, which is the accessible baseline. Pause here to show you.
- **After task 8:** every area mode works.
- **After task 9:** full suite green, and the README documents the results.
