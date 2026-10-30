# Freehand map area search accessibility: patterns, prior art, and testing

Scope: design patterns, real implementations, and a testing plan for an accessible web (Google Maps JS) property search with "なぞる" (freehand trace) area selection. WCAG/legal analysis and Google Maps / Terra Draw / markerclusterer capability analysis are covered by other researchers. Research date: 2026-10-29. GitHub data (issues, releases, source) was pulled live via the GitHub API on that date; Japanese site markup was fetched with curl on that date (server-rendered HTML only, before client-side JS ran).

---

## 1. Keyboard-operable area drawing on web maps (crosshair/reticle, click-to-place, vertex editing) — who implements it and how

### Takeaway
The most complete open-source web implementation of the "pan map under a fixed crosshair, press Enter to drop a vertex" pattern is DEFRA's (UK Dept for Environment, Food & Rural Affairs) `interactive-map` draw plugin. It is MIT-licensed, works on MapLibre and OpenLayers, and is still alpha/beta (v0.0.58-alpha, 2026-10-28). The big drawing libraries mostly don't do this. Esri Sketch and Azure Maps only offer an "F = add vertex at the *mouse pointer*" shortcut, which still needs a pointer. Mapbox GL Draw and Leaflet.draw have open issues saying keyboard drawing is unsupported. Leaflet-Geoman only added Escape-to-exit and Enter-to-finish. None of these is built for Google Maps JS, so the team would have to build the crosshair pattern itself (e.g., read `map.getCenter()` on Enter).

### Cited Findings
**DEFRA interactive-map (strongest prior art; GOV.UK-styled; MapLibre + OpenLayers adapters)**
- The repo calls itself an "Accessibility-first interactive map component for government frontends". Latest tag is v0.0.58-alpha (published 2026-10-28) and the repo was pushed 2026-10-29. Defra's own page says it is "currently in beta and not yet stable", with documentation and support "not yet available". — [GitHub DEFRA/interactive-map](https://github.com/DEFRA/interactive-map); [releases](https://github.com/DEFRA/interactive-map/releases); [Defra accessible maps page](https://digital.defra.gov.uk/architecture-and-software-development/defra-accessible-maps)
- Draw plugin: users "draw and edit point, polygon and line features on the map — placing vertices by click, tap, or keyboard", with snapping and live geometry validation. It "works identically with both the MapLibre and OpenLayers map providers". — [docs/plugins/draw.md](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/draw.md)
- Crosshair pattern, quoted from the docs: "While drawing, a crosshair marks where the next point is placed. On touch, it's shown with the Add point button. Keyboard users get the crosshair and press Enter to add a point. Opening the map controls shows the crosshair and Add point button for every input type. Edit modes don't use the crosshair: vertices and midpoints are selected directly." — [draw.md "Buttons and keyboard shortcuts"](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/draw.md)
- Draw/edit key bindings: Enter = add point (draw). Space = select nearest point (edit). Option/Alt + arrows = select adjacent point (edit). Arrows = move point (edit). Shift + arrows = nudge point by a fine step (edit). Delete = delete point (edit). Cmd/Ctrl + Z = undo. Toolbar buttons are registered automatically: "Cancel, Add point and Done in the actions bar, plus Undo, Snap and Delete point". — [draw.md](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/draw.md)
- Core map keys: arrows = "Move in large steps"; + / - = "Zoom in large steps"; Shift + arrows / Shift + +/- = nudge (disabled by default); Shift + ? = keyboard help panel; Escape = clear selection; Alt/Option + I (Ctrl + I on Windows/Linux, "Alt+letter is reserved there for browser/OS menu mnemonics") = announce the place name at the map centre plus the visible area's dimensions (needs a reverse-geocode provider). The help-panel row for that last one is visually hidden but available to assistive technology. — [src/App/controls/keyboardShortcuts.js](https://github.com/DEFRA/interactive-map/blob/main/src/App/controls/keyboardShortcuts.js); [keyboardMappings.js](https://github.com/DEFRA/interactive-map/blob/main/src/App/controls/keyboardMappings.js); [docs/api.md `reverseGeocodeProvider`](https://github.com/DEFRA/interactive-map/blob/main/docs/api.md)
- Keyboard shortcuts are ignored while a form control outside the map has focus. They still work for controls inside the map viewport, and Cmd/Ctrl+Z is not intercepted while a text field is focused. — [plugins/draw/src/adapters/maplibre/utils/keyboardShortcuts.js](https://github.com/DEFRA/interactive-map/blob/main/plugins/draw/src/adapters/maplibre/utils/keyboardShortcuts.js)
- Built-in validation: a polygon needs 3 vertices. "A vertex that would make the drawn path cross itself is rejected and never placed". "While a rule fails, the shape has a dashed outline" (a non-colour cue). App callbacks can return `result.announcement`, which is "read out by screen readers instead of draw's own message". — [draw.md Validation](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/draw.md)
- The interact plugin (select features / place a marker) uses the same idea: "Keyboard users get the crosshair while the map has focus, and press Enter to select". Selectable features need a `labelProperty` to "appear in keyboard navigation" via a "keyboard-accessible listbox". — [docs/plugins/interact.md](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/interact.md)

**Esri ArcGIS Maps SDK for JavaScript — Sketch widget**
- Keys: F = add a vertex to a polyline/polygon. Enter = finish without the staged vertex. Space + drag = pan while drawing. Z / R = undo / redo, scoped to the current create/update operation. Ctrl = toggle snapping. Tab = tooltip "input mode" for typing values or constraints. While updating, Backspace/Delete deletes selected vertices and right-click deletes a vertex. The docs say nothing about ARIA roles or focus management. The `Sketch` widget is deprecated as of SDK 5.0 in favour of the `arcgis-sketch` component. — [Esri Sketch reference](https://developers.arcgis.com/javascript/latest/references/core/widgets/Sketch/)
- Limitation reported by the community: F adds the vertex at the *pointer location*, so it only works after the mouse has moved. Users report this broke in 4.21. Esri staff in the same thread say selecting and updating vertices is "not very keyboard accessible with our API at the moment". — [Esri Community: Sketch tool keyboard commands](https://community.esri.com/t5/accessibility-questions/sketch-tool-keyboard-commands/m-p/1242457/highlight/true); [another reply in the same thread](https://geonet.esri.com/t5/accessibility-questions/sketch-tool-keyboard-commands/m-p/1242563/highlight/true)
- A 2019 Esri developer thread asked how to start a sketch from the keyboard at a chosen map point. No accepted answer was found. — [Esri Community thread](https://community.esri.com/t5/accessibility-questions/how-can-i-make-a-completely-keyboard-accessible/m-p/855296/highlight/true)
- Esri's native Flutter SDK has a `GeometryEditorReticle`: a reticle centred in the map view (crosshair by default) that "can be customized for accessibility requirements". It is a design reference only (native, not web). — [ArcGIS Maps SDK for Flutter GeometryEditorReticle](https://developers.arcgis.com/flutter/api-reference/reference/arcgis_maps/GeometryEditorReticle-class.html)

**Azure Maps Web SDK drawing tools**
- Supports `click`, `freehand` and `hybrid` interaction types. Keys: F = add a coordinate "if the mouse is over the map", at the pointer position. C = complete the drawing and set mode to idle ("Focus moves to top-level map element"). Escape = cancel ("Focus moves to top-level map element"). Delete/Backspace = delete selected shapes in edit mode. Freehand sampling is controlled by `freehandInterval`. Page last updated 2024-08-09. — [Microsoft Learn: Drawing tools interaction types and keyboard shortcuts](https://learn.microsoft.com/en-us/azure/azure-maps/drawing-tools-interactions-keyboard-shortcuts)

**Mapbox GL Draw**
- Has a `keybindings` option (default true) described as "keyboard interactions for drawing". — [mapbox-gl-draw API.md](https://github.com/mapbox/mapbox-gl-draw/blob/main/docs/API.md)
- Issue #1410 (opened 2025-06-12 by Elastic/Kibana, still open on 2026-10-29) is titled "Accessibility: No keyboard support for drawing shapes". A 2026-06-08 comment says apps using the library can't meet WCAG 2.1.1. Separate open issues report keybinding bugs (#805, #1103). — [mapbox-gl-draw #1410](https://github.com/mapbox/mapbox-gl-draw/issues/1410); [Kibana #215841](https://github.com/elastic/kibana/issues/215841); [#805](https://github.com/mapbox/mapbox-gl-draw/issues/805); [#1103](https://github.com/mapbox/mapbox-gl-draw/issues/1103)

**Leaflet.draw / Leaflet-Geoman**
- Leaflet.draw issue #925 (2019, still open): you can Tab to a draw control and press Enter to start, but "At this point everything stops". The reporter asks for exactly the crosshair pattern: "start using the centre point of the view-port then use arrow navigation to pan. The next time I hit enter a new point is added". Related open issues are #936 (help improving keyboard accessibility) and #1004 (`<a href="#">` controls should be buttons). — [Leaflet.draw #925](https://github.com/Leaflet/Leaflet.draw/issues/925); [#936](https://github.com/Leaflet/Leaflet.draw/issues/936); [#1004](https://github.com/Leaflet/Leaflet.draw/issues/1004)
- Leaflet-Geoman PR #1612 (merged 2025-12-12) added two global options, both off by default for backward compatibility: `exitModeOnEscape` (exit any draw/edit/drag/rotate/remove/cut mode with Escape) and `finishOnEnter`. No keyboard vertex placement was found. — [leaflet-geoman PR #1612](https://github.com/geoman-io/leaflet-geoman/pull/1612)
- A WebAIM list thread describes making Leaflet polygons Tab-reachable and Enter-activatable by modifying the DOM, and argues that points, polygons and lines all need to be keyboard accessible. — [WebAIM list](https://webaim.org/discussion/mail_message?id=50896)

**OpenLayers / others**
- OpenLayers 2's "accessible click control" example (legacy) works like this: focus the map, press "i" to activate the query control, move a point with the arrow keys, confirm with Return. This is an early keyboard-reticle precedent. — [OpenLayers 2.12 accessible click control example](https://wichita.ogs.ou.edu/OpenLayers-2.12/examples/accessible-click-control.html)
- Geocortex (VertiGIS) Essentials has a Draw "keyboard mode" for digitising polygons and polylines, with a separate marker symbol for the vertex being placed. — [Geocortex accessibility Draw API](https://docs.geocortex.com/essentials/gvh/4.12/api-help/classes/_mapping_infrastructure_amd_d_._geocortex_infrastructure_accessibility_draw_.draw.html)
- Real government service shortfall: the Environment Agency's "Flood map for planning" (draw a site boundary) lists as known failures 2.1.1 ("boundary reshaping works only with a mouse") and 2.5.7 ("boundary reshaping requires dragging"). It was tested against WCAG 2.2 AA by the Digital Accessibility Centre on 13 March 2025. — [flood-map-for-planning accessibility statement](https://flood-map-for-planning.service.gov.uk/accessibility-statement)

### Inferences
- The "F at pointer" approach (Esri, Azure) helps mouse users with tremor (no click motion) but is **not** a keyboard alternative. Without a pointer there is no position. The centre-crosshair pattern (DEFRA; requested in Leaflet.draw #925; OpenLayers 2) removes the pointer dependency because the position is always the map centre.
- On Google Maps JS: the team would build a CSS crosshair overlay at the viewport centre. Panning uses the map's built-in arrow-key handling or custom buttons. Enter/Space appends `map.getCenter()` as a vertex; Backspace / Cmd/Ctrl+Z undoes; a "Done" button (or Enter on the first vertex / C) closes the polygon; Escape cancels. Each vertex add should be announced (e.g., "頂点3を追加、あと1点で範囲確定可"). The DEFRA source shows how to gate shortcuts so they don't fire while typing in form fields.
- DEFRA's keyboard map (Enter add; Space select nearest vertex; Alt+arrows next vertex; arrows move; Shift+arrows nudge; Delete; Cmd/Ctrl+Z) is a sensible, documented scheme to copy rather than inventing new bindings. It also avoids single-letter keys (F, C, Z, R), which conflict with screen-reader browse-mode quick keys and with WCAG 2.1.4 Character Key Shortcuts unless they are scoped to focus.

### Gaps
- Could not verify current OpenLayers (v10/v11) `Draw` interaction keyboard support. A GitHub issue search for "draw keyboard accessibility" in openlayers/openlayers returned 0 results. DEFRA's OpenLayers adapter shows it can be built on top.
- No Japanese 自治体 GIS (e.g., 統合型GIS, 全国Q地図) was found with keyboard polygon drawing. Japanese-language searches returned only US/UK material.
- The `arcgis-sketch` web component's keyboard/ARIA behaviour (which replaces the deprecated widget) was not checked in this pass.
- QGIS web clients (QWC2, Lizmap) were not examined.

---

## 2. Non-map equivalents with "equivalent purpose": radius selectors, station/address combobox, hierarchical checkbox lists, "search this area"; how Japanese sites structure them

### Takeaway
Japanese portals already provide rich non-map routes: 沿線→駅 and エリア→市区町村 checkbox tables, a HOME'S line-filter and commute combobox, and a live hit count. These are the natural "equivalent purpose" alternatives to なぞる. Their markup quality varies. At home and SUUMO's ward page associate labels properly. SUUMO's 沿線 page, in the server-rendered HTML, has checkboxes with no programmatic label. HOME'S announces counts with an assertive alert and uses the older ARIA 1.1 combobox structure. No Japanese portal publishes a WCAG conformance statement for its search UI (none found).

### Cited Findings
- **SUUMO 沿線 (lines) page** (`suumo.jp/chintai/tokyo/ensen/`, fetched 2026-10-29): 82 checkboxes, 0 `<label for>`. Markup pattern: `<input type="checkbox" name="rn" value="0005" id="kaishaBox_001_rnBox0005"> <label><a href="/chintai/tokyo/en_yamanotesen/">ＪＲ山手線</a><span>(287012)</span></label>`. The `<label>` neither wraps the input nor uses `for`, so the checkbox has no accessible name, and the label text is a link to a separate page. — [SUUMO 東京都 沿線・駅](https://suumo.jp/chintai/tokyo/ensen/)
- **SUUMO area page** (`/chintai/tokyo/city/`): 190 checkboxes and 195 `<label for>`, e.g. `<input type="checkbox" name="sc" value="13101" id="la13101"><label for="la13101"><span>千代田区</span><span>(32718)</span></label>`. The labels are properly associated and include the listing count. No `fieldset`/`legend` grouping: the groups (e.g., 東京都 - 都心部) are table header `<th>` cells. — [SUUMO 東京都 エリア](https://suumo.jp/chintai/tokyo/city/)
- **at home 沿線 page**: 80 checkboxes, 81 `<label for>` (e.g., `id="yamanote"` / `for="yamanote"`). No ARIA attributes in the server HTML. — [at home 東京都 沿線・駅](https://www.athome.co.jp/chintai/tokyo/line/)
- **LIFULL HOME'S 路線 page**: heavy ARIA use (89 `aria-expanded`, 83 `role="button"`, 2 `role="combobox"`, 3 `role="region"`). Details:
  - A disclosure region labelled "路線の絞り込み" ("路線が多すぎて選べませんか？") contains a combobox in the ARIA 1.1 structure (`<div role="combobox" aria-owns="line_filter_comboboxlistbox" aria-haspopup="listbox">` wrapping an `<input aria-autocomplete=...>`), plus a second combobox `commute_comboboxlistbox` (commute-based search).
  - The footer region "検索フィールド" holds `<p role="alert" aria-busy="true" aria-live="assertive" aria-atomic="true">該当物件数<span>…</span>件</p>`, a live hit count that updates as stations are checked.
  - Station checkboxes appear to be rendered client-side (only 3 checkboxes in the server HTML).
  — [HOME'S 東京都 路線から賃貸を探す](https://www.homes.co.jp/chintai/tokyo/line/)
- HOME'S app search entry points listed in its app store description: 路線・駅 / 市区町村 / 現在地周辺 / フリーワード, plus switching the result list to a map and searching on it. — [AppFollow listing of HOME'S iOS app](https://apps.appfollow.io/ios/ren-dai-wu-jian-jian-suo-homusu-bu-wu-tan-siojia-tan-sibu-dong-chan-yin-yue-si/342650611?country=jp)
- SUUMO's "なぞって探す" launched in the SUUMO for iPhone rental app and was billed as "不動産検索アプリ初". A Recruit engineering deck pairs the app's なぞって検索 with the smartphone-web 地図検索. — [digitalpr.jp release](https://digitalpr.jp/r/1733); [Recruit Speaker Deck on SUUMO map search](https://speakerdeck.com/recruitengineers/suumo-sumo-gati-gong-suru-di-tu-karatan-su-zhu-maitan-siti-yan-falsexin-tanaqu-rizu-mi); [ieagent explainer](https://ieagent.jp/blog/chie/suumo-nazottesagasu-541442)
- "Search this area" prior art: VertiGIS "Search New Extent" shows a "Search This Area" button only after the user pans a map that already has results, then reapplies the search. Yext's locator module does the same: a manual trigger instead of auto-refresh ("Many locators, such as Yelp and Google Maps, enable users to initiate a new search after the visible map boundaries have changed"). — [VertiGIS Search New Extent](https://docs.vertigisstudio.com/webviewer/latest/admin-help/settings-search-new-extent.html); [Yext Search This Area](https://hitchhikers.yext.com/modules/pgs604-create-locator/07-adv-search-this-area/)
- An old W3C WAI-IG reply on drawing tools suggests "using inputs and coordinates or addresses of some kind to designate areas and lines and shapes is probably the more user-friendly way to go" (2014; old). — [w3c-wai-ig 2014](https://lists.w3.org/Archives/Public/w3c-wai-ig/2014JulSep/0106.html)
- The ARIA APG combobox pattern is the reference for station/address autocomplete. The current APG pattern puts `role="combobox"` on the input itself; HOME'S uses the older wrapper structure. — [WAI-ARIA APG Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)

### Inferences
- "Equivalent purpose" alternatives to なぞる, from closest to loosest. Each should feed the same result list and count:
  1. Keyboard crosshair polygon (same output geometry).
  2. Radius from a chosen point: a station/address combobox plus a native `<select>` or radio group for 500m / 1km / 2km / 徒歩5・10・15分.
  3. Multi-select 市区町村 / 町名 and 沿線→駅 checkbox trees.
  4. "このエリアで検索" (the current viewport as a rectangle, which pan-by-keyboard can reach).
  5. Commute/walking-time isochrone from a station (HOME'S already has a commute combobox).
- For the 沿線→駅 tree: use `<fieldset><legend>ＪＲ山手線</legend>` per line, with real `<label>`-wrapped checkboxes and a "全駅を選択" tri-state parent. Keep the count inside the label (SUUMO ward pattern), and don't put links inside checkbox labels (the SUUMO 沿線 pattern fails 1.3.1/4.1.2 for screen readers and voice users, who can't say "click 山手線").
- "Search this area" as an explicit button (not auto-refresh on every pan) avoids constant result churn and live-region spam for keyboard and screen-reader users who pan in steps. Pair it with a polite status update when it runs.
- HOME'S `role="alert"` + `aria-live="assertive"` for a count that changes on every checkbox tick will interrupt users. `role="status"` (polite) with debouncing is preferable (see §3).

### Gaps
- Yahoo!不動産's line-search URL I guessed returned 404, so its non-map search markup was not inspected.
- Server-rendered HTML only. Client-rendered station lists (HOME'S) and SP (smartphone-web) variants were not tested with real screen readers. No audit reports, accessibility statements or 当事者 reviews of SUUMO / HOME'S / at home / Yahoo!不動産 search were found.
- No public source describes how SUUMO's smartphone-web map search exposes the map to assistive technology.

---

## 3. Screen-reader experience for map results: role/labelling of the map, live result counts, list parity, cluster badges, focus after drawing, skip links

### Takeaway
Current best practice treats the visual map as an enhancement over a complete, sortable text list:
- Give the map region a task-describing label. Use `role="application"` only if you fully handle the keys yourself, and hide the canvas tiles with `aria-hidden`.
- Announce settled counts through one persistent polite `role="status"` region (debounced ~200–500 ms).
- Expose clusters and markers as named buttons or a listbox.
- Keep focus where the user acted (or move it deliberately to a results heading), never trapping it in the map.

DEFRA's component is a concrete open-source reference for all of this.

### Cited Findings
- **DEFRA viewport markup**: the map viewport is a `div` with `role='application'`, `tabIndex='0'`, `aria-label={mapLabel}`, `aria-describedby` pointing at keyboard instructions, and `aria-controls` pointing at a "spatial list". The rendered map container is `aria-hidden='true'`, as is the marker layer. A `MapStatus` element with `role='status'` carries announcements. — [Viewport.jsx](https://github.com/DEFRA/interactive-map/blob/main/src/App/components/Viewport/Viewport.jsx); [MapStatus.jsx](https://github.com/DEFRA/interactive-map/blob/main/src/App/components/Viewport/MapStatus.jsx)
- **DEFRA "SpatialList"**: a `role='listbox'` (`aria-label`, default "Map features", optional `aria-multiselectable`) whose `role='option'` items mirror visible map features. It uses a roving tabindex ("exactly one option is a Tab stop at a time"), and items have `tabIndex`/`onClick` "to let voice control and screen readers reach and activate each option". — [SpatialList.jsx](https://github.com/DEFRA/interactive-map/blob/main/src/App/components/Viewport/SpatialList.jsx)
- **DEFRA `mapLabel` guidance**: default "Interactive map application", "Always set your own". "Describe what the map shows or what it's for, not where it is. Users can move the map, so a place name soon stops being true", e.g. "Map for drawing your field boundaries". — [docs/api.md mapLabel](https://github.com/DEFRA/interactive-map/blob/main/docs/api.md)
- **DEFRA `behaviour: 'buttonFirst'`** (default): "Map is initially hidden and a button is displayed in its place. Selecting the button opens the map in fullscreen mode … This provides a less intrusive experience for users who do not need or cannot use the map." `showHint()` toasts are "announced to screen readers". — [docs/api.md behaviour / showHint](https://github.com/DEFRA/interactive-map/blob/main/docs/api.md)
- **Admiralty (UKHO) design system, "Find a location" pattern**:
  - "Use `role="application"` only if you manage keyboard behaviour inside the map. Otherwise, use `region` or `group` with a descriptive label."
  - Label dynamic results such as "3 search results". Give markers accessible names.
  - "Include a textual list of results in the side panel". "Every map action … must also be available from the panel or sidebar".
  - Focus order sidebar → map controls → side panel. "Avoid locking focus inside the map unless absolutely necessary". Move focus appropriately when the panel updates.
  — [Admiralty Find a location](https://designsystem.admiralty.co.uk/patterns/find-a-location)
- **Defra flood-map blog (2021)**:
  - Feature information goes to screen readers and voice interfaces through an `aria-live` region.
  - Lists and text are the primary route, with the map an optional visual layer. Showing the map only on request ("View map of the flood warning area") reduced confusion.
  - When 9 or fewer features are in view, number overlays map to keypresses for quick selection.
  — [Defra Digital blog: Designing a more accessible flood map](https://defradigital.blog.gov.uk/2021/05/20/designing-a-more-accessible-flood-map)
- **Google Maps JS markers**:
  - Markers default to role `img`, or `button` if they have a click listener. `title` becomes the accessible label. Tab reaches the first marker, arrow keys cycle markers, Enter "clicks".
  - InfoWindow moves focus in on open and restores it on close; set `shouldFocus` explicitly.
  - The improvements apply only to non-optimized markers. Legacy `google.maps.Marker` is deprecated in favour of `AdvancedMarkerElement`.
  - A "Keyboard shortcuts" button opens a dialog of map controls (blog dated 15 June 2021).
  — [Make markers clickable and accessible](https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers); [Marker Accessibility example](https://developers.google.com/maps/documentation/javascript/examples/marker-accessibility); [Google Maps Platform blog, 2021](https://mapsplatform.google.com/resources/blog/improved-accessibility-maps-javascript-api)
- **Esri JS SDK**: uses an ARIA live region to announce dynamic content plus a map description, and notes that some screen readers (e.g., Narrator) don't support `aria-describedby` (from search-result summary; the page returned 403 to direct fetch). — [Esri ArcUser: JS accessibility](https://www.esri.com/about/newsroom/arcuser/jsaccessibility/)
- **Live-region timing**:
  - Drupal's `announce()` batches messages and waits ~200 ms ("right at the cusp where humans notice a pause"). Rapid replacement means only the last message is read.
  - A WordPress core ticket found 500 ms the most common live-search delay, and 250 ms worse for users with motor disabilities.
  - Live regions should exist in the DOM from page load.
  — [Drupal announce.js (mirror)](https://www.fs.usda.gov/core/misc/announce.js); [WordPress Trac #32720](https://core.trac.wordpress.org/ticket/32720); [LibreTexts Live Announcer docs](https://davis.libretexts.org/docs/components/live-announcer)
- WCAG 4.1.3 Status Messages covers search-result counts announced without moving focus (`role="status"`). — [Understanding SC 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- **Proxi map feature accessibility statement**: a "Browse Locations" panel "contains every location on the map as a scrollable, searchable text list", positioned as a full path for screen-reader and keyboard users, not a fallback. — [Proxi accessibility statement](https://learn.proxi.co/en/articles/14185096-proxi-map-feature-accessibility-statement)
- **Sarah Higley (SitePen, 2018)** on 2D marker navigation trade-offs: directional arrow keys with a single tab stop, linear lat/long ordering, centre-outward, region shortcuts, and exposing markers as a list (gives a count). Explain any non-native keyboard interaction, and remember screen readers have their own shortcuts. — [SitePen: Navigating accessibility in two dimensions](https://sitepen.com/blog/navigating-accessibility-in-two-dimensions)
- An OsloMet thesis / 2021 Springer paper concluded interactive maps were "not screen-reader accessible at all" in its sample. — [OsloMet ODA](https://oda.oslomet.no/oda-xmlui/handle/11250/2982540)

### Inferences
- Recommended structure for the property page:
  - A skip link or heading navigation to "検索結果一覧 (n件)". It can sit before the map, or the list can come first in DOM order with the map visually beside it.
  - The map wrapper gets `role="region"` + `aria-label="物件地図（なぞった範囲内の物件を表示）"` when it only uses native Google Maps keyboard handling.
  - Switch to `role="application"` (DEFRA style) only inside an explicit "範囲を描く" mode where you own arrows, Enter and Escape.
  - Hide tile and canvas content from assistive technology, but keep cluster and marker buttons reachable.
- **Cluster badges**: render as `AdvancedMarkerElement` with a click listener, so Google gives them `role=button` and uses `title` as the label. Use a label like "349件の物件。クリックで拡大", not the bare "349". Mirror the visible clusters/markers in a list or listbox (DEFRA SpatialList) so screen-reader users can browse without spatial navigation.
- **Announcements**: one persistent `role="status"` region, polite and atomic. Announce only settled states, debounced ~300–500 ms after `idle` / draw-finish, e.g.:
  - "範囲を確定しました。範囲内の物件 210件。一覧へ移動するには…"
  - "地図を移動しました。『このエリアで検索』で再検索できます"
  Never announce every pan step. Avoid `assertive` (the HOME'S pattern).
- **Focus after drawing completes**: Azure moves focus to the map element and DEFRA keeps focus in the map viewport. For a search, keep focus on the map/Done button and announce the count plus how to reach the list, or move focus to the results heading only when the user pressed a "結果を見る" button. Avoid moving focus unexpectedly on pointer-drawn completion.

### Gaps
- No Equal Entry, Deque or TPGi article specifically about interactive web maps was found in this pass (only a TPGi podcast transcript; see §7). There is also no published screen-reader test result for `role="application"` vs `role="region"` on Google Maps specifically.
- Google's docs don't say how `@googlemaps/markerclusterer` cluster markers expose names. The other researcher covering libraries should confirm.

---

## 4. Voice control (iOS/macOS Voice Control, Dragon, Android Voice Access) and switch access with drawing

### Takeaway
Voice and switch users can do point-to-point drags (grid "Drag 3 to 14", Voice Access "Drag 10") and pinch. None of the documented commands can trace an arbitrary closed path, so freehand なぞる is effectively unavailable to them. They need visible, nameable buttons: an on-screen pan D-pad, an "頂点を追加" button at a centre crosshair, Done/Undo/Cancel, and the list-based alternatives. DEFRA's docs state this rationale explicitly.

### Cited Findings
- DEFRA `enableMapControls` (default true): "a button that reveals on-screen move, zoom, and precision buttons, plus a target point, typically used to place or select features on the map without a drag gesture. This gives a non-dragging way to operate the map, for anyone who can't perform a drag or pinch gesture (e.g. switch access users) and for voice interfaces such as Voice Control, which can trigger a button click but not a drag." Disabling it "can fail WCAG 2.5.7 (Dragging Movements)". — [DEFRA docs/api.md enableMapControls](https://github.com/DEFRA/interactive-map/blob/main/docs/api.md)
- **Android Voice Access** documented commands: "Drag [label or number]", "Long-press [item]", "Show numbers", "Show grid" / "More squares" / "Fewer squares", grid commands such as "Drag 10", "Swipe left on 12", "Long press 8", and "Pinch in" / "Pinch out" (the only multi-point gestures listed). No arbitrary-path gesture is listed. — [Google: Use Voice Access commands](https://support.google.com/accessibility/android/answer/6151854?hl=en)
- **macOS Voice Control**: with item names, numbers or a grid visible, users can say "Drag [item] to [location]", e.g. "Drag 3 to 14". Saying a grid number refines the grid. — [Apple: Use Voice Control commands (Mac)](https://support.apple.com/en-am/guide/mac-help/mh40719/mac); [Apple: Number and grid overlays](https://support.apple.com/en-asia/guide/mac-help/mchl26854b08/12.0/mac)
- **Apple (iPhone)**: "precisely select, drag, and zoom by showing numbers alongside clickable items or by superimposing a grid on the screen". Voice Control custom commands can run a recorded custom gesture. — [Apple Accessibility – Mobility](https://apple.com/accessibility/mobility); [Tom's Guide on custom Voice Control commands](https://www.tomsguide.com/computing/browsers/with-ios-18-you-can-set-up-custom-voice-trigger-phrases-for-iphone-heres-how)
- DEFRA's touch/precision mode shows a crosshair plus a "Select" / "Add point" button. Its docs warn against turning that off unless targets are at least 44×44 CSS px, because users with motor impairments "rely on the crosshair to position the map instead". — [DEFRA interact.md touchTarget](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/interact.md)

### Inferences
- A recorded iOS custom gesture could replay one fixed path, but that is not a practical way to trace a new area each time. Treat freehand as unavailable for voice and switch users.
- Every control needs a visible text label matching its accessible name (WCAG 2.5.3 Label in Name), so users can say "Tap 範囲を描く", "Tap 頂点を追加", "Tap 完了", "Tap 元に戻す". Icon-only buttons force "Show numbers".
- The crosshair + "頂点を追加" button + on-screen pan arrows give one mechanism that serves keyboard, switch, voice and tremor users at once. This is the DEFRA design rationale.

### Gaps
- No primary documentation was found for Dragon's mouse-drag commands ("MouseGrid", "drag mouse") or for iOS/Android Switch Control drag capabilities. These need hands-on testing or vendor docs.
- No user research was found on voice/switch users attempting map polygon drawing specifically.

---

## 5. Low vision / zoom: polygon contrast, non-colour cues, cluster badges, 400% zoom/reflow, forced colours, reduced motion

### Takeaway
Real government services fail exactly here: non-text contrast of the target/crosshair and overlapping areas, colour-only focus and zones, and reflow of map side panels. Mitigations with precedent:
- Hatched or pattern fills and dashed outlines as non-colour cues.
- Halos behind vertex handles.
- Simple, muted basemaps.
- 44×44 controls.
- Testing at 200%/400% and in high-contrast mode.
- Honouring `prefers-reduced-motion`. Esri and MapLibre do this natively; for Google Maps JS no native support was found, so implement it yourself.

### Cited Findings
- **Flood map for planning** (DAC test, March 2025) known failures:
  - 1.4.1: keyboard focus in search results, and flood zones, distinguished by colour alone.
  - 1.4.10: the "Key" panel can't be magnified without two-dimensional scrolling.
  - 1.4.11: the flood defence symbol, overlapping regions, and the "black target selector against 'Flood zone 3'" lack contrast.
  — [flood-map-for-planning accessibility statement](https://flood-map-for-planning.service.gov.uk/accessibility-statement)
- Defra used hatched fills so flood-risk areas can be told apart without colour, and a "thick yellow outline" for focused buttons/overlays. — [Defra Digital blog 2021](https://defradigital.blog.gov.uk/2021/05/20/designing-a-more-accessible-flood-map)
- The DEFRA draw plugin exposes `editHalo` ("halo drawn behind vertex/midpoint handles for contrast"), separate colours for active vertex / midpoint / invalid stroke, and light/dark style-keyed colours. Invalid shapes use a dashed outline. — [DEFRA draw.md colour overrides](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/draw.md)
- Scottish Government design system guidance:
  - Text labels need sufficient contrast against the basemap.
  - "Avoid vibrant basemap colours" and avoid greyscale.
  - Use the simplest basemap and split complex maps.
  - Offer adjustable text size and, if available, a high-contrast mode.
  - Pan/zoom controls should have clear symbols.
  — [designsystem.gov.scot: Building accessible maps](https://designsystem.gov.scot/guidance/maps/building-accessible-maps)
- Admiralty design system:
  - Layouts must work at 200% zoom, in high-contrast mode, portrait and small screens. "Test zoomed layouts up to 400%".
  - Use relative units. Map controls need at least 44×44px targets.
  - Text over the map needs 4.5:1 contrast.
  - "Avoid or minimise animated map transitions (e.g. zooming or panning) that could cause motion sensitivity."
  — [Admiralty Find a location](https://designsystem.admiralty.co.uk/patterns/find-a-location)
- Google Maps JS markers: default markers meet the WCAG AA minimum target size; AAA needs larger scaling. — [Google: Make markers accessible](https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers)
- Google Maps JS improvements (Japanese blog, 2022) cover tab order, keyboard and screen-reader interaction, and high-contrast mode support (from search summary). — [Google Developers Japan blog 2022-07](https://developers-jp.googleblog.com/2022/07/maps-javascript-api.html)
- **Forced colours**: browsers override author colour properties, including SVG `fill` and `stroke`. `forced-color-adjust: none` opts an element out and should be used only for small usability tweaks. — [MDN forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors); [MDN forced-color-adjust (mirror)](https://docs.w3cub.com/css/forced-color-adjust)
- **Reduced motion**:
  - Esri ArcGIS Maps SDK for JS honours reduced motion in 2D MapViews since 4.30 (June 2024): `goTo()` animations are removed and panning momentum is disabled.
  - MapLibre / Mapbox GL treat camera animations as non-essential under `prefers-reduced-motion` unless `essential: true` is passed. MapLibre 5.10.0 fixed `flyTo` padding when reduced motion is on.
  — [Esri blog: Supporting reduced motion](https://www.esri.com/arcgis-blog/products/js-api-arcgis/mapping/supporting-reduced-motion-enhancing-accessibility-in-web-apps); [MapLibre example (essential flag)](https://maplibre.org/maplibre-gl-js/docs/examples/slowly-fly-to-a-location/); [MapLibre AnimationOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/AnimationOptions); [OSM rails-dev note on maplibre 5.10.0](https://lists.openstreetmap.org/pipermail/rails-dev/2025-October/044718.html)
- A Lullabot ADR (2026-05) checks `matchMedia("(prefers-reduced-motion: no-preference)")` before JS animations and lists map panning as a possible exception, since the motion conveys spatial context. — [Lullabot ADR](https://architecture.lullabot.com/adr/20260522-reduced-motion-handling/)

### Inferences
- **Drawn polygon**: use a ≥3px stroke with a contrasting halo/casing (e.g., dark stroke with white outer stroke) so it reaches 3:1 against both light and dark tiles (WCAG 1.4.11). Use a low-alpha or hatched fill plus a dashed vs solid line to distinguish "drawing in progress" from "confirmed area". Dim outside the area (a mask) so "inside" is not conveyed by hue alone.
- **Cluster badges** ("210", "349"): text ≥4.5:1 on the badge, the badge edge ≥3:1 against tiles, a ≥24×24 CSS px target (44 preferred on mobile), and labels that scale with text zoom. Don't encode density by colour alone; the number already does this.
- **Google Maps JS**: check `matchMedia('(prefers-reduced-motion: reduce)')` yourself. Use `setCenter`/`setZoom`/`fitBounds` without `panTo`'s animation for zoom-to-fit after drawing.
- **400% zoom** (320 CSS px): the map plus list must collapse to a single column with a "地図 / リスト" toggle. The drawing toolbar must not cover the crosshair, and the list must be reachable without two-dimensional scrolling. The map is likely exempt from reflow as content needing 2D layout, but its surrounding UI is not.
- **Forced colours**: map tiles drawn to canvas/WebGL are not recoloured, but HTML/SVG overlays (badges, toolbar, crosshair) will be. Test that the crosshair and polygon stay visible, e.g. with `forced-color-adjust: none` plus system colours like `CanvasText`/`Highlight` on the crosshair.

### Gaps
- No primary source confirms how Google Maps JS vector or raster tiles behave under Windows forced colours, or whether `panTo` honours `prefers-reduced-motion`. No Google documentation was found, so test directly.
- No published contrast measurements were found for polygon styles over Google's default Japanese basemap.

---

## 6. Cognitive/motor: undo/redo, confirm before replacing, clear drawing-mode indication/exit, tremor tolerance, touch targets

### Takeaway
Mature tools share a set of features:
- An explicit draw "mode" that hides unrelated UI.
- Persistent Cancel / Undo / Done buttons, with Escape as a shortcut.
- Live validation that rejects invalid vertices (with an announcement) rather than failing at the end.
- Configurable freehand sampling.
- 44×44 targets with a crosshair fallback for imprecise pointers.

"Confirm before replacing an existing area" and tremor smoothing have little published precedent; treat them as design decisions to test with users.

### Cited Findings
- **DEFRA "application mode"**: "While drawing or editing, the plugin sets the 'draw' application mode, which gives the interface over to drawing: every button, panel and control … is hidden except draw's own and these defaults: ['mapStyles', 'mapControls', 'scaleBar']." — [DEFRA draw.md Application mode](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/draw.md)
- **DEFRA undo/cancel semantics**: a new shape that fails the finish check "reopens in edit mode … where Undo starts empty and Cancel discards it". Cancel emits `draw:cancelled`. `setGeometry` changes "can be undone". A draw event is "emitted when the input device changes mid-session" with `interfaceType: 'mouse' | 'touch' | 'keyboard'` (I didn't record the exact event name). — [DEFRA draw.md](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/draw.md)
- **Esri Sketch**: Z/R undo/redo within the operation. — [Esri Sketch](https://developers.arcgis.com/javascript/latest/references/core/widgets/Sketch/)
- **Leaflet-Geoman**: `exitModeOnEscape` and `finishOnEnter`, off by default. — [PR #1612](https://github.com/geoman-io/leaflet-geoman/pull/1612)
- **Azure Maps**: the drawing mode "stays enabled, even after a shape has been drawn". Escape cancels, C completes. Freehand sampling is set by `freehandInterval`. — [Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-maps/drawing-tools-interactions-keyboard-shortcuts)
- Azure's F key ("one hand to position the mouse and other to press the button without moving the mouse from the press gesture") is framed as a precision aid for mouse users. — [Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-maps/drawing-tools-interactions-keyboard-shortcuts)
- **Defra flood blog**: users with Parkinson's or arthritis "can find it difficult to use a mouse and often prefer to use a keyboard". — [Defra Digital blog 2021](https://defradigital.blog.gov.uk/2021/05/20/designing-a-more-accessible-flood-map)
- **Touch targets**: DEFRA cites WCAG 2.2 Target Size (Enhanced) 44×44 CSS px and recommends a crosshair over direct tapping for thin or small features. Admiralty requires map controls of at least 44×44px. — [DEFRA interact.md](https://github.com/DEFRA/interactive-map/blob/main/docs/plugins/interact.md); [Admiralty](https://designsystem.admiralty.co.uk/patterns/find-a-location)
- **Environment Agency flood map for planning**: the "Add", "Edit", "Delete" buttons failed 2.4.6 because their names weren't descriptive, and "draw a boundary" failed 1.3.1/4.1.2 because its purpose and interactivity were unclear. — [accessibility statement](https://flood-map-for-planning.service.gov.uk/accessibility-statement)

### Inferences
- **Mode indication**: a persistent banner, e.g. "範囲を描いています — 指でなぞるか、＋を移動して［頂点を追加］。［完了］［元に戻す］［キャンセル］". Give the なぞる toggle `aria-pressed`, announce entry and exit, and add a visible cursor/crosshair change. Escape and Cancel must restore the previous area.
- **Replacing an area**: rather than a modal confirm, offer non-destructive replacement with one-tap "元に戻す" (undo restores the previous polygon and count). This is lower friction and also satisfies error-prevention goals. Use a confirm dialog only if undo is impossible.
- **Tremor tolerance for freehand**: sample by minimum distance (e.g., ignore points <4–8 px apart), simplify the path (Douglas–Peucker) before closing, auto-close the gap between end and start, and never fail on self-intersection. Instead, repair it (e.g., convex hull or buffer(0)) or reject with an explicit message, as DEFRA does for vertices. Also treat an accidental tap on なぞる mode as a no-op, not an empty search.
- **Mobile**: drawing mode must disable one-finger map pan (otherwise tracing pans the map). Provide a visible way to pan while in mode, such as two-finger pan plus on-screen arrows for users who cannot do multi-touch.

### Gaps
- No published research was found on tremor smoothing parameters for map freehand drawing, or on user testing of "confirm vs undo" for replacing search areas.

---

## 7. Expert guidance on accessible web maps (consultancies, government design systems, Google, Japanese guidance)

### Takeaway
Government design systems give the most concrete guidance: UK Defra, Scottish Government, UKHO Admiralty, and the DEFRA interactive-map component. Their consensus is "the map is a visual enhancement; provide a complete text/list route". No GOV.UK Design System map component exists. Japanese official guidance (デジタル庁 guidebook, WAIC) has no map-specific content that was found. Consultancy articles from Deque, TPGi and Equal Entry specifically about interactive maps were not found in this pass.

### Cited Findings
- **Defra's guidance**: maps should work as visual add-ons, all essential geographic information must be available in a non-visual format, and interactive maps should be used only when there is a clear user need (search summary of Defra data-visualisation guidance). — [Defra data visualisation](https://digital.defra.gov.uk/design/data-visualisation)
- **No official GOV.UK component**: a DfE service design-history page says there is no official GOV.UK Design System component for maps (from search summary; not confirmed on design-system.service.gov.uk itself). — [DfE design history: showing search results on a map](https://becoming-a-teacher.design-history.education.gov.uk/register-of-placement-schools/exploring-showing-search-results-on-a-map); [GOV.UK Design System upcoming components](https://design-system.service.gov.uk/community/upcoming-components-patterns)
- **Scottish Government** ("Provide another way for users to complete tasks, such as alternative content"; "Do accessibility testing with users"). — [designsystem.gov.scot](https://designsystem.gov.scot/guidance/maps/building-accessible-maps)
- **Admiralty "Find a location"** (see §3 and §5). — [Admiralty](https://designsystem.admiralty.co.uk/patterns/find-a-location)
- **Defra flood-map blog**: tested with disabled users via the Digital Accessibility Centre and concluded no single fix works for every map, so test with your own users. Future ideas included reverse-geocoding the map centre and listing features in view. The 2026 DEFRA component now ships both. — [Defra blog 2021](https://defradigital.blog.gov.uk/2021/05/20/designing-a-more-accessible-flood-map); [DEFRA api.md](https://github.com/DEFRA/interactive-map/blob/main/docs/api.md)
- **FOSS4G:UK 2026 talk** "The Map Is Not the Interface" (Pascal Coulon, CGI UK, 13 Oct 2026): argues accessibility is a geospatial problem, not just front-end compliance. Proposes text, tables and structured summaries, audio-friendly descriptions, simplified views, GDS-compliant UI and voice Q&A over map data. — [FOSS4G:UK 2026 talk page](https://talks.osgeo.org/foss4g-uk-2026/talk/77B9XV/)
- **TPGi "Real People Real Stories" 2024 Ep. 5** (blind contributor): "Traditionally, the approach has been to find the map's main purpose and try to convey that through an alternative mode." — [TPGi transcript](https://www.tpgi.com/wp-content/uploads/Real-People-Real-Stories-2024-Episode-5.txt)
- **Google Maps Platform**: marker accessibility guides and the 2021 accessibility blog (see §3). The Japanese developer blog (2022) covers the same improvements. — [Google: accessible markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers); [Google Developers Japan blog](https://developers-jp.googleblog.com/2022/07/maps-javascript-api.html)
- **NSGIC / US context**: US state and local governments must meet WCAG 2.1 AA for web content, including web maps and GIS apps, under the DOJ ADA Title II rule, with first deadlines in April 2026 (from search summary). — [NSGIC: Making GIS data accessible (Oct 2025)](https://nsgic.org/knowledge-base/making-gis-data-accessible-and-ada-compliant-october-8-2025/); [Indiana GIS: NSGIC one-pager](https://www.in.gov/gis/geoinsights/posts/enhancing-gis-accessibility-insights-from-the-nsgic-accessibility-one-pager)
- **デジタル庁 ウェブアクセシビリティ導入ガイドブック**: a beginner's guide for officials and businesses that labels problems 必須 / 重大 / 非推奨. It was folded into デジタル社会推進標準ガイドライン on 2025-10-16 (per issoh.co.jp). No map-specific section was found. — [デジタル庁 guidebook](https://www.digital.go.jp/resources/introduction-to-web-accessibility-guidebook); [issoh.co.jp column](https://issoh.co.jp/column/details/3990)
- **Japanese enterprise WCAG 2.2 practice**: JR東日本 publishes per-page test results against JIS X 8341-3 / WCAG 2.2, including SC 2.5.7 (ドラッグ動作, AA) with technique G219. This is evidence that Japanese corporates audit 2.5.7. — [JR東日本 2.5.7 check page example](https://www.jreast.co.jp/web_accessibility/2025/03/39/2.5.7.html)
- **Other vendor statements**: Living Map states its map app only partially conforms to WCAG 2.2 AA, with some interactive tools not keyboard-operable, and targeted fixes by end of 2025 (search summary). ArcGIS StoryMaps (UW–Madison KB) notes some interactive maps aren't keyboard-operable or announced, and recommends data tables. — [Living Map accessibility](https://www.livingmap.com/accessibility); [UW–Madison KB StoryMaps](https://kb.wisc.edu/helpdesk/131965)

### Inferences
- For a Japanese commercial property site, the most defensible framing is the UK government consensus: the list and station/area search are the primary accessible path; なぞる and the map are enhancements; a keyboard/voice crosshair mode is the equivalent for area geometry. Back this with an accessibility statement in the 試験結果 style that JR東日本 publishes.

### Gaps
- No Equal Entry, Deque or WebAIM *article* on interactive map drawing was found (only WebAIM list threads). WAIC (waic.jp) translations and techniques mentioning maps were not surfaced by search. No Japanese 自治体 GIS accessibility case studies were found.

---

## 8. Testing: automated tools and their blind spots, manual AT matrix, Japanese screen-reader usage

### Takeaway
Use automated checks for the DOM around the map: labels, roles, contrast of HTML badges and toolbar, landmarks, live-region presence. Use axe-core via `@axe-core/playwright` in CI, plus Lighthouse/Pa11y. Then rely on a scripted manual matrix for everything map-specific: canvas content, keyboard drawing, announcement timing, list parity, 2.5.7 alternatives, contrast over tiles, forced colours, and reduced motion.

Global usage favours testing NVDA, JAWS, VoiceOver iOS and TalkBack (WebAIM #10, early 2024; NVDA most popular in Asia). For Japan, add NVDA日本語版 and PC-Talker. No current quantitative Japanese product-share survey was found.

### Cited Findings
- **Deque (March 2021)**: automated axe testing found 57% of issues *by volume* across 2,000+ audits and 13,000+ pages. It is measured by issue count, not by WCAG criteria, and axe-core prioritises zero false positives (vendor study). — [Deque study](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues)
- Admiralty recommends axe, Lighthouse or WAVE for contrast and landmarks, plus VoiceOver/NVDA/JAWS and keyboard-only testing. — [Admiralty](https://designsystem.admiralty.co.uk/patterns/find-a-location)
- **Playwright** supports `@axe-core/playwright` scans and notes that automated tests catch only some problems; manual assessment and inclusive user testing are also needed. — [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing)
- Defra and the Environment Agency used the Digital Accessibility Centre for automated plus assistive-technology user testing against WCAG 2.2 AA (13 Mar 2025). The issues found included non-text contrast over map tiles, drag-only reshaping, and a missing "how to reach the map" instruction for screen-reader users — none detectable by DOM scanners. — [flood-map-for-planning statement](https://flood-map-for-planning.service.gov.uk/accessibility-statement)
- **DEFRA interactive-map** has unit tests for keyboard handlers, crosshair visibility and the spatial list (e.g., `keyboardHandlers.test.js`, `useCrossHairVisibility.test.js`, `SpatialList.test.jsx`). This shows keyboard drawing logic can be unit-tested. — [DEFRA repo tree](https://github.com/DEFRA/interactive-map)
- **WebAIM Screen Reader User Survey #10** (Dec 2023–Jan 2024, 1,539 responses):
  - Primary desktop: JAWS 40.5%, NVDA 37.7%, VoiceOver 9.7%.
  - 91.3% use a screen reader on mobile, and VoiceOver leads mobile at 70.6%.
  - NVDA is most popular in Europe, Africa/Middle East and Asia.
  - The sample is not controlled.
  — [WebAIM survey #10 results](https://webaim.org/projects/screenreadersurvey10/); [WebAIM blog](https://webaim.org/blog/screen-reader-user-survey-10-results/)
- **Japan, NDL survey of visually impaired users** (Sep–Oct 2021, 739 responses): 274 (37.1%) use a screen reader for reading documents, and 473 (64.0%) cite smartphones/tablets as an important information channel. No breakdown by screen-reader product. — [国立国会図書館 アンケート2021](https://www.ndl.go.jp/jp/library/supportvisual/questionnaire2021.html)
- **Japan, older data**: a 2007 IEICE paper abstract found 330 of 391 PC-using respondents used screen readers (very old). The NISE (国立特別支援教育総合研究所) report covers screen-reader use without a product-share figure in the excerpts seen. — [IEICE abstract](https://www.ieice.org/ken/paper/200805293adB/); [NISE D-190 ch.5](https://www.nise.go.jp/josa/kankobutsu/pub_d/d-190/D-190_05.pdf)
- PC-Talker is described by a Japanese source as the top-share paid Japanese screen reader. This is an undated, non-survey claim. — [mobinc.jp](https://mobinc.jp/media/?p=2984)

### Inferences
**Automated layer (CI)**
- Playwright + `@axe-core/playwright` on these states: initial, drawing mode active, polygon complete with results, list view, cluster popover open, and 320px/400% viewport.
- Assert that the `role="status"` element exists at load and its text after drawing (e.g., `toHaveText(/210件/)`).
- Assert `aria-pressed` on the なぞる button and that every map marker/cluster has an accessible name. Use `getByRole('button', { name: /件の物件/ })`.
- Run a keyboard-only Playwright script: Tab to map → "範囲を描く" → ArrowRight×n → Enter ×4 → "完了". Assert that a polygon exists and the count updates. This covers the 2.5.7 / 2.1.1 alternative regression.
- Emulate `prefers-reduced-motion` and `forced-colors: active` with `page.emulateMedia` and screenshot-diff the crosshair and polygon.

**What automated tools cannot judge**
- Whether the canvas polygon or tiles meet 3:1.
- Whether arrow-key panning and crosshair placement are actually usable.
- Whether announcements are well-timed and not spammy.
- Whether the list includes every result inside the drawn area (parity).
- Whether focus moves sensibly.
- Whether voice/switch users can complete the task.
- Whether instructions make sense.

**Manual matrix (minimum)**
- NVDA + Chrome and NVDA + Firefox on Windows; also NVDA日本語版 with Japanese speech.
- JAWS + Chrome.
- PC-Talker + Edge/Chrome for the Japanese market.
- VoiceOver + Safari on macOS and on iOS.
- TalkBack + Chrome on Android.
- Keyboard only, with visible focus.
- Windows High Contrast / forced colours (Edge/Chrome).
- Browser zoom at 200% and 400% (320 CSS px reflow).
- iOS Voice Control and Android Voice Access, via the "Tap 頂点を追加" path.
- iOS Switch Control.
- OS reduce-motion on.
- Test both browse/virtual mode and focus/forms mode inside the map, especially the `role="application"` behaviour.

**Scripted tasks**
- Find properties within 1 km of 渋谷駅.
- Select stations on 東横線 via the list.
- Draw an area with the keyboard crosshair and hear the count.
- Undo the last vertex.
- Cancel drawing.
- Replace an existing area and undo the replacement.
- Open a cluster and reach its properties in the list.
- Use "このエリアで検索" after panning.

### Gaps
- No current (2024–2026) quantitative survey of Japanese screen-reader product share (PC-Talker vs NVDA日本語版 vs JAWS vs VoiceOver) was found.
- It was not confirmed whether WebAIM has published a Survey #11 after #10 (early 2024). The #10 figures may be outdated as of 2026-10.
- Lighthouse and Pa11y internals (their axe-core subset, HTML_CodeSniffer runner) were not re-verified in this pass.
- No published test results were found for Google Maps JS with PC-Talker.
