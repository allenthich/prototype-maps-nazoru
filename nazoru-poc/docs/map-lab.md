# Configurable store map prototype

## Objective and baseline behavior

Provide a configurable, locally testable map prototype at `/nagoya/map-lab/`. Existing rental examples remain available. All sample stores, addresses, prices and district boundaries are illustrative, deterministic sample data.

Default: map closed; pins refresh after map movement settles; the regular results list refreshes only on 「このエリアの店舗情報を表示」. Category and preference filters apply to both queries. The committed search, current viewport and selected pin are independent. Changing a district fits the filtered stores (or district bounds for zero results); changing other filters does not move the map. Closing/reopening preserves the camera and does not commit exploration.

Pin interactions remain experimental: none, compact preview or half-modal. Cluster interaction is independently zoom or show its stores. A cluster configured to show stores still opens a half-modal when individual pin previews are disabled. Gray/pink membership refers to the entire committed result set, not the current pagination page. Selected pins are red and receive an additional outline. Proximity clusters never mix result membership; identical locations remain grouped at every zoom. Separate coincident groups receive visual offsets without changing their geographic coordinates.

## Configuration and contracts

Named presets are values of the same validated configuration, with independent overrides encoded in `ui_*` URL parameters. A copied link includes filters, committed scope, viewport, current map visibility and configuration. Initial defaults can be reset without losing the current search. No account, persistent database or new dependency is required.

`stores.json` accepts `view=pins|results|selection`, category/preferences, committed `scope`, and a viewport for pins. Pins return only ID/name/coordinates/building/result membership. Results and selection return paginated store information plus a total. Invalid input returns HTTP 400 with `{error:{message}}`; failed requests retain the last successful UI. Abort and generation checks prevent stale requests from overwriting newer state.

The UI uses the existing Astro/plain TypeScript patterns. Geometry reuses `src/core/area`; drawing reuses `src/widget/trace.ts` and `crosshair.ts`. Strings inserted as HTML are escaped; other dynamic text uses textContent. The new page and endpoints are noindex.

## Implementation slices and acceptance

1. Configuration and search model (`src/prototype/`, `tests/unit/prototype/`). Verify strict URL parsing, preserved filter behavior, viewport exploration outside a committed district, and result membership with focused Vitest tests.
2. Prototype page and map lifecycle (`src/pages/nagoya/map-lab/`, UI components, controller). Verify automatic pins/manual results, camera preservation, filter transitions, and copied settings.
3. Selection and optional tools. Verify cluster membership separation, complete paginated cluster contents, selected-state restoration, radius, tracing and keyboard polygon selection.
4. Responsive verification and local preview. Run `rtk pnpm check`, `rtk pnpm test:unit`, `rtk pnpm build`, and relevant Playwright flows. Check 320/768/1024/1440 layouts, keyboard focus and modal dismissal in the shared browser. Start using `rtk pnpm exec astro dev --background --host 0.0.0.0`.

Always validate query inputs and preserve working results on errors. Never commit keys, create branches/commits without user instruction, or claim sample geography is production data. Use only fictional sample content and neutral branding in public demos.

## References

- [Astro routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Astro styling](https://docs.astro.build/en/guides/styling/)

## Verification — November 9, 2026

- `rtk pnpm test:unit`: 81 tests passed.
- `rtk pnpm exec playwright test --workers=2`: 69 tests passed, including the original 46 tests and neutral demo content checks. The command also builds the production app.
- `rtk pnpm check`: no errors, warnings or hints.
- The new flows cover all four pin/list refresh combinations, three individual pin actions, cluster zoom and full selection pagination, filter races, failures, shared camera/settings, radius, keyboard drawing and pointer tracing.
- Mobile screenshot inspected at 390 pixels; live layouts checked at 320, 768, 1024 and 1440 pixels without horizontal overflow. Automated accessibility checks pass. Real-device and assistive-technology testing remains outside this local verification.
