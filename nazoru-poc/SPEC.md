# Spec: なぞる area search — SEO-forward, accessible web PoC

Status: **v2 — approved 2026-10-30.** v2 adds SEO requirements, switches the host to Astro 7, and makes the map a framework-agnostic web component.

Background research:
- `../reports/Freehand map area search.md`
- `../reports/Freehand map area search accessibility.md`

## Objective

Build a small, runnable proof of concept for a property-search site that is **SEO-forward and accessible first**, with finger-traced ("なぞる") map search as a progressive enhancement on top.

The PoC should show three things:
1. **Indexable pages are plain, fast, server-rendered HTML.** These are the ward pages, station pages and listing detail pages. They need correct metadata and structured data, and no client JS except the map widget.
2. **Map area search meets WCAG 2.2 AA.** A user can trace, use the keyboard crosshair, pick a radius preset, or use "search this area". All of these produce one area model, which feeds one server-rendered result list.
3. **The map widget is portable.** It is a light-DOM custom element (`<nazoru-map>`), so it can move to whichever stack the team finally picks.

User stories:
- **Searcher (Google):** a searcher lands from Google on `/nagoya/station/sakae/`. They get a fast page with a heading, a listing count, a paginated list and breadcrumbs, and it works without JS.
- **Touch or mouse user:** taps **なぞる**, traces a loop, and sees the result list and cluster counts update in place.
- **Keyboard, voice-control or switch user:** sets an area with the **crosshair** mode. They use visible buttons (頂点を追加 / 元に戻す / 完了 / キャンセル, plus a pan pad) and never drag.
- **No-JS or screen-reader user:** searches by **ward / station list** or a **radius preset** through a plain GET form.
- **Searcher who pans the map:** pans, then presses **このエリアで検索**.

### Decisions (confirmed 2026-10-30)
- Host framework: **Astro 7**. The stack decision for the real product is still open; this PoC informs it.
- The map, trace and crosshair live in a **framework-agnostic web component**.
- **A Google Maps JS API key is provided** through T3's secure prompt and stored in `.env`.
- Sample data covers **central Nagoya**.

### Assumptions (correct any of these)
1. **Web only.** Desktop and mobile browsers.
2. **Own data, not Google Places.** About 1,500 synthetic listings around real central-Nagoya stations, at approximate coordinates. They are generated from a fixed seed and held in memory on the server. The README notes PostGIS `ST_Intersects` as the production replacement.
3. **Japanese UI** (`<html lang="ja">`). Code and comments are in English.
4. **Out of scope:**
   - walking isochrones (the Google API is still in Preview)
   - saved searches and alerts
   - favorites/history/my page
   - auth
   - real data
   - deployment and CDN cache providers
   - hreflang/i18n
   - Terra Draw (a custom pointer overlay is used instead)

## Tech Stack

| Piece | Choice | Version (npm, 2026-10-30) |
|---|---|---|
| Host | **Astro 7**, on-demand rendering via `@astrojs/node` (standalone) | `astro` 7.4.4, `@astrojs/node` 11.1.9 |
| Caching | Astro route caching (`Astro.cache.set`) with built-in `memoryCache()`. It is inactive in dev, so test it with build + preview | stable since 7.0 |
| Map widget | Vanilla TypeScript custom element, **light DOM** (so ARIA id references work) | — |
| Map | Google Maps JS via `@googlemaps/js-api-loader`; `AdvancedMarkerElement` | 2.1.3 |
| Clustering | `supercluster`, on the client, over every in-area point the server returns | 9.1.0 |
| Geometry | `@turf/boolean-point-in-polygon`, `@turf/kinks`, `@turf/area`, `@turf/helpers`, `@turf/circle` (stroke simplification is our own, in screen pixels) | 7.4.0 |
| Checks | `astro check` (types); Astro dev toolbar audit (accessibility and performance) | `@astrojs/check` 0.9.12 |
| Tests | Vitest (unit), Playwright + `@axe-core/playwright` (e2e, accessibility, SEO tags) | 5.0.5 / 1.64.1 / 4.14.0 |
| Tooling | pnpm 10.25, Node 26 (Astro 7 needs ≥ 22.23.4) | — |

Why Astro for this PoC:
- Landing and detail pages ship zero JS by default.
- Route caching suits listings that change often.
- HTML-first output is the easiest to keep semantic.
- Partials (`export const partial = true`) let the list update in place as server-rendered HTML, so the same HTML serves no-JS users, crawlers and enhanced users.

Main trade-offs:
- App-like features would need islands.
- `@astrojs/sitemap` can't list on-demand routes, so the PoC serves its own sitemap endpoint.

## Routes and SEO model

| Route | Rendering | Indexing | Contents |
|---|---|---|---|
| `/` → `/nagoya/` | SSR + cache | index | Ward and station link lists, search form |
| `/nagoya/ward/[ward]/` | SSR + cache | **index**; self-canonical; `?page=n` pagination | `<h1>名古屋市中区の賃貸物件</h1>`, count, paginated list, map widget, BreadcrumbList + ItemList JSON-LD |
| `/nagoya/station/[station]/` | SSR + cache | **index** | Same as the ward page, for listings whose nearest station is this one |
| `/nagoya/search/?…` | SSR, no cache | **`noindex, follow`** (user-defined polygons, radii and bounds are effectively unlimited, so they shouldn't be indexed) | Custom area results. This is the target of the GET form and of the widget |
| `/nagoya/search/results?…` | Partial (`partial = true`) | not linked; `X-Robots-Tag: noindex` | The results region HTML plus a JSON point list for clusters |
| `/listings/[id]/` | SSR + cache | **index** | Detail page, `RealEstateListing` + `Apartment` JSON-LD, breadcrumbs |
| `/sitemap.xml`, `/robots.txt` | Endpoints | — | Sitemap of every ward, station and listing URL; robots file pointing to it |

SEO rules:
- Every indexable page has:
  - a unique `<title>` and meta description
  - one `<h1>`
  - a canonical link
  - Open Graph basics
  - breadcrumbs (visible and in JSON-LD)
  - crawlable `<a href>` pagination
- The map loads Google Maps JS **only when the widget scrolls into view and the browser is idle, or on first interaction**. The widget reserves its space with `aspect-ratio`, so loading it causes no layout shift. The largest contentful element (LCP) stays the heading or the list.
- No indexable content depends on JS.

## Area model and data flow

```ts
// The one area model every search mode produces (framework-agnostic, src/core/area/)
export type SearchArea =
  | { kind: 'stations'; stationIds: string[] }
  | { kind: 'wards'; wardIds: string[] }
  | { kind: 'radius'; center: LatLng; radiusM: 500 | 1000 | 2000; origin: string }
  | { kind: 'bounds'; sw: LatLng; ne: LatLng }
  | { kind: 'polygon'; ring: LatLng[]; source: 'trace' | 'crosshair' };
```

How a search flows:
1. `<nazoru-map>` dispatches `area-change` with a serialized area. Polygons are an encoded polyline of at most 100 vertices.
2. A small page controller fetches `/nagoya/search/results?…` and swaps the results region.
3. It then calls `history.pushState` to `/nagoya/search/?…`, so Back undoes the search, and hands the point list back to the widget for clustering.
4. Finally it announces the settled count in the single polite status region.
5. **Without JS**, the same GET form navigates to `/nagoya/search/?…` and gets the full server-rendered page.

## Commands

```bash
pnpm install
pnpm dev                 # astro dev — http://localhost:4321 (route cache inactive in dev)
pnpm check               # astro check
pnpm test:unit           # vitest run
pnpm test:e2e            # playwright test (builds + previews; map specs need the key)
pnpm build && pnpm preview
```

## Project Structure

```
nazoru-poc/
  SPEC.md  README.md  .env.example  astro.config.ts  playwright.config.ts
  src/
    core/                       framework-agnostic, no Astro imports
      area/model.ts             SearchArea + URL (de)serialisation
      area/validate.ts          min vertices, self-crossing, min/max area → Japanese messages
      area/filter.ts            point-in-area for each kind
      area/summary.ts           Japanese text summary (the 1.1.1 text alternative)
      geo/polyline.ts           encoded polyline
    data/                       stations, wards, seeded listings (server-only)
    widget/                     <nazoru-map> custom element (vanilla TS, light DOM)
      nazoru-map.ts             element lifecycle, lazy Maps loading
      trace.ts                  pointer overlay → screen points → LatLng on lift
      crosshair.ts              Enter/Backspace/Esc; map.getCenter() vertices
      clusters.ts               supercluster → AdvancedMarkerElement (gmpClickable, ja title)
      styles.ts                 two-tone outlines, dashed drafts
    client/search-controller.ts fetch partial → swap → pushState → announce
    components/                 .astro: Layout (head/SEO), Breadcrumbs, AreaForm, ResultList, MapWidget, Announcer
    pages/                      routes from the table above
  tests/unit/  tests/e2e/
```

## Code Style

The server renders the widget's markup and the custom element adds behavior to it. Native elements come before ARIA.

```astro
<nazoru-map data-api-key={key} data-map-id={mapId}>
  <section aria-labelledby="map-heading">
    <h2 id="map-heading">地図で探す</h2>
    <p id="map-help">「なぞる」で範囲を描くか、「十字で範囲指定」でキーボード操作できます。</p>
    <div class="toolbar" hidden data-enhanced-only>
      <button type="button" aria-pressed="false" data-action="trace">なぞる</button>
      <button type="button" aria-pressed="false" data-action="crosshair">十字で範囲指定</button>
    </div>
    <div class="map" aria-describedby="map-help"></div>
  </section>
</nazoru-map>
```

Conventions:
- Each accessible name contains its visible text.
- No `role="application"`. No shadow DOM in the widget.
- `src/core` never imports from `astro:*` or the DOM, so it can be unit-tested and ported.

## Testing Strategy

- **Unit (Vitest), test-first** for `src/core`:
  - URL round-trips for every area kind
  - validation messages
  - point-in-area for every kind
  - summary text
  - polyline encode/decode
- **E2E (Playwright, against build + preview):**
  - *SEO:*
    - ward, station and listing pages return full HTML with `<title>`, a meta description, one `<h1>`, a canonical link and valid JSON-LD
    - `/nagoya/search/` has `noindex, follow`
    - the sitemap lists every ward, station and listing URL
    - landing pages load **no Maps JS** before the widget is in view
  - *No-JS project:* the ward/station/radius form returns the server-rendered list, count heading and summary.
  - *Keyboard crosshair* (@map): Tab to the map → crosshair → ArrowRight ×3 → Enter ×4 → 完了 → the list updates in place and the status region announces the count.
  - *Trace* (@map):
    - a pointer drag produces a polygon and results
    - Escape mid-stroke aborts
    - a figure-8 stroke shows an error and keeps the previous area
  - *Parity* (@map): the cluster total equals the heading count.
  - *axe:* zero serious or critical violations on the landing, ward, listing and search pages, in trace and crosshair modes, and at a 320 px viewport.
  - *Media:* `forced-colors: active` and `prefers-reduced-motion: reduce` keep the crosshair and outline visible.

## Boundaries

- **Always:**
  - Semantic HTML first; Japanese visible labels.
  - Keep `keyboardShortcuts` on, and use `gestureHandling: 'none'` only while tracing.
  - Run check, unit and e2e tests before calling a slice done.
- **Ask first:**
  - Dependencies beyond the list above.
  - Google Places or any paid API beyond Maps JS.
  - Isochrones.
  - Any git commit or branch (per AGENTS.md).
- **Never:**
  - Commit, log or print the API key. `.env` is gitignored and the key is never echoed.
  - Put `role="application"` on the map.
  - Use `aria-live="assertive"` for anything except shape errors.
  - Make an indexable page's content depend on JS.

## Success Criteria

1. **SEO:**
   - Ward, station and listing pages are complete server-rendered HTML with unique titles and descriptions, one `<h1>`, a canonical link, breadcrumbs and valid JSON-LD.
   - Custom-area pages are `noindex, follow`.
   - `/sitemap.xml` lists every indexable URL.
   - Indexable pages ship no JS except the lazy map widget.
2. **Performance:**
   - Maps JS is not requested until the widget is visible and the browser is idle, or the user interacts with it.
   - No layout shift from the map. The LCP element is text.
   - A cached ward page answers from the memory cache on repeat requests (checked in preview).
3. **No JS:** ward, station and radius-preset searches work through GET forms and return the server-rendered list with a count heading and a text area summary.
4. **List and map agree:** the cluster total equals the heading count for every area kind.
5. **なぞる:**
   - The button exposes `aria-pressed`.
   - The trace completes on pointer-up; Escape or `pointercancel` aborts it.
   - Invalid strokes give a text error and keep the previous area.
   - Results update in place, with no focus jump.
6. **Crosshair:**
   - Operable by keyboard **and** by visible buttons, including the pan pad.
   - Needs at least 3 vertices; undo and cancel work.
   - The mode can always be left by keyboard.
7. **このエリアで検索:** an explicit button searches the viewport; panning never searches automatically.
8. **Announcements:** exactly one polite `role="status"` region, present from load and debounced, announces settled results.
9. **Clusters:**
   - Each cluster is an `AdvancedMarkerElement` with `gmpClickable` and a Japanese `title`.
   - Activating one zooms in, then focus lands somewhere predictable and the change is announced.
10. **Visuals and targets:**
    - Outlines use a dark stroke with a white casing, dashed while drafting.
    - Touch controls are at least 44×44 px.
    - Forced-colors and reduced-motion are handled.
11. **axe:** zero serious or critical violations in the listed states.
12. **No API key:** the map region explains itself, and every list-based search still works.

## Open Questions

1. Are the **URL shapes** right for your SEO plans? For example, `/nagoya/ward/naka/` versus SUUMO-style `/chintai/aichi/sc_nagoyashinaka/`. The PoC only needs them to be stable and readable.
2. Should station pages be defined by **nearest station** (the PoC's choice) or by **walking distance** (e.g., 徒歩10分以内)?
