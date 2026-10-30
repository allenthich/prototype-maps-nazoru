# Google Maps JavaScript API (web): official drawing tools and how to build freehand "trace an area" search

Research date: 2026-10-29. Scope: web / Maps JavaScript API only. Native SDKs, search backends/Places, and non-Google alternatives are covered by other researchers.

## Q1. What is the status of the Drawing Library (google.maps.drawing.DrawingManager), and what does Google recommend instead?

### Takeaway
The Drawing Library is gone. Google deprecated it in Maps JS API 3.62.2c (28 Aug 2025), and DrawingManager stopped working in 3.65.3b (4 Jun 2026). Google's deprecations page lists it as a completed decommission ("May 2026") and names Terra Draw, a third-party open-source library, as the example replacement. Google says it does not support Terra Draw.

### Cited Findings
- Deprecations page, "Completed deprecations": the heading is "Drawing Library (May 2026)". The body says "Drawing Library functionality in the Maps JavaScript API is no longer supported." It says the API "was deprecated in August 2025" and became unavailable in May 2026, and that customers should switch to alternatives "for example Terra Draw". The entry links to Google's Terra Draw sample. — [Google Maps Platform deprecations](https://developers.google.com/maps/deprecations)
- Release notes, 3.62.2c (28 August 2025): "The Drawing Library is deprecated." — [Maps JS API release notes](https://developers.google.com/maps/documentation/javascript/releases)
- Release notes, 3.65.3b (4 June 2026): "The DrawingManager functionality in the Maps JavaScript API is no longer available." — [Maps JS API release notes](https://developers.google.com/maps/documentation/javascript/releases)
- The latest `@types/google.maps` (3.66.9) still declares the class but marks it deprecated: "@deprecated The DrawingManager functionality in the Maps JavaScript API is no longer available in the Maps JavaScript API as of version 3.65." So TypeScript code will still compile but fail at runtime. — [@types/google.maps latest index.d.ts (unpkg)](https://unpkg.com/@types/google.maps@latest/index.d.ts)
- The old Drawing Library guide URL now just says the library is decommissioned and points to Terra Draw. It no longer documents the drawing workflow. — [developers.google.com/maps/documentation/javascript/drawinglayer](https://developers.google.com/maps/documentation/javascript/drawinglayer)
- Google's replacement sample is "Draw on a map using Terra Draw". It says: "Terra Draw is a third-party product, and is not supported by Google." — [Google sample: map-drawing-terradraw](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw)
- Conflicting third-party claim: a MapAtlas blog dates the deprecation to May 2025 and names the Extended Component Library as the replacement. Google's own pages contradict this (deprecated Aug 2025, Terra Draw recommended), so treat MapAtlas as wrong. — [MapAtlas blog](https://mapatlas.eu/blog/google-maps-api-deprecations-migration) vs. [Google deprecations](https://developers.google.com/maps/deprecations)
- Known breakage in the wild: SuiteCRM's JJWG Maps drawing stopped working, and a Bubble plugin added Terra Draw as a replacement. — [SuiteCRM forum](https://community.suitecrm.com/t/jjwg-maps-drawing-isnt-available-anymore/101264); [Bubble plugin](https://bubble.io/plugin/google-maps-geometrydrawing-+-w3w-1624091755647x305703615501434900)
- Related deprecation: `google.maps.Marker` was deprecated in 3.56 (Feb 2024) in favor of `google.maps.marker.AdvancedMarkerElement`. No removal date is set yet ("At least 12 months notice"). — [Google deprecations](https://developers.google.com/maps/deprecations)
- `google.maps.Polygon`, `google.maps.Polyline`, `OverlayView` and the `geometry` library are not deprecated. The deprecations page has no entries for them; the only deprecation on the Polygon reference page is the `rightclick` event (use `contextmenu`). Release notes for 2025-2026 show only typing fixes for OverlayView (3.65.5e, 17 Jun 2026). — [Polygon reference](https://developers.google.com/maps/documentation/javascript/reference/polygon); [release notes](https://developers.google.com/maps/documentation/javascript/releases)

### Inferences
- Any 2026 implementation should use Terra Draw or custom code built on `Polyline`/`Polygon` + `OverlayView`. Do not use DrawingManager. Older blog posts and Stack Overflow answers that use `google.maps.drawing` are outdated.
- Google has not shipped a first-party 2D drawing replacement. The new polygon-like web components in recent releases (`Polygon3DElement`, `Polyline3DElement`) belong to 3D Maps only ([release notes](https://developers.google.com/maps/documentation/javascript/releases)). I found no `gmp-polygon` 2D web component.

### Gaps
- I couldn't confirm the exact day in May 2026 when the Drawing Library was decommissioned beyond the 3.65.3b release note (4 Jun 2026). One search-result summary said "Deprecated as of Aug 8, 2025", but the live deprecations page I fetched shows only "August 2025" and the release note says 28 Aug 2025.
- I found no Google Maps Platform blog post announcing the deprecation or Terra Draw.

## Q2. Did the Drawing Library ever support freehand drawing?

### Takeaway
No. DrawingManager only offered five overlay types: CIRCLE, MARKER, POLYGON, POLYLINE and RECTANGLE. You built polygons and polylines by clicking to place vertices. Freehand "lasso" drawing always needed custom code.

### Cited Findings
- `google.maps.drawing.OverlayType` contained only `CIRCLE = 'circle'`, `MARKER = 'marker'`, `POLYGON = 'polygon'`, `POLYLINE = 'polyline'` and `RECTANGLE = 'rectangle'`. The class doc says it "Allows users to draw markers, polygons, polylines, rectangles, and circles on the map." — [@types/google.maps 3.58.1 index.d.ts](https://unpkg.com/@types/google.maps@3.58.1/index.d.ts); [@types/google.maps latest](https://unpkg.com/@types/google.maps@latest/index.d.ts)
- Community freehand tutorials exist because the built-in modes lacked freehand. A GeekyAnts tutorial (around 2021) and a CodeProject tip build freehand drawing from mousedown, mousemove and mouseup plus a Polyline that is then converted to a Polygon. — [GeekyAnts: freehand sketching on Google Maps](https://techblog.geekyants.com/a-brief-how-to-on-freehand-sketching-on-google-maps); [CodeProject: Freehand drawing using Google Map](https://legacy.codeproject.com/Tips/5294895/Freehand-Drawing-using-Google-Map-and-Spatial-Sear)

### Inferences
- The "click each vertex, then click the first vertex to close" interaction comes from widely known DrawingManager behavior. I couldn't re-fetch the decommissioned guide to quote it, but no freehand option exists in the enum.

### Gaps
- The original Drawing Library guide page has been replaced, and web.archive.org was not reachable from my tools. I can't quote the old click-interaction text verbatim.

## Q3. How do you implement freehand drawing on the Maps JS API yourself?

### Takeaway
The building blocks are all current, non-deprecated APIs:
1. Lock map gestures with `map.setOptions({gestureHandling: 'none'})`. `draggable` has been deprecated since 2017.
2. Capture Pointer Events on the map container or a transparent overlay.
3. Convert screen pixels to LatLng with an `OverlayView`'s `getProjection().fromContainerPixelToLatLng()`.
4. Push points into a live `google.maps.Polyline` path (an MVCArray).
5. On pointerup, simplify the path (turf.simplify / Douglas-Peucker), fix self-intersections (turf.unkinkPolygon, or a convex hull), and render a `google.maps.Polygon`.

Terra Draw's Google adapter does almost exactly this internally.

### Cited Findings
**Locking map gestures**
- `MapOptions.gestureHandling` values:
  - `"cooperative"`: one-finger gestures and scroll move the page; two fingers pan and zoom the map.
  - `"greedy"`: "All touch gestures and scroll events pan or zoom the map."
  - `"none"`: "The map cannot be panned or zoomed by user gestures."
  - `"auto"` (default): cooperative or greedy depending on whether the page is scrollable or in an iframe.

  — [Map reference, MapOptions](https://developers.google.com/maps/documentation/javascript/reference/map)
- `MapOptions.draggable` was "Deprecated in 2017. To disable dragging on the map, you can use the gestureHandling property, and set it to 'none'." `disableDoubleClickZoom` and `scrollwheel` are marked "not recommended" in favor of `gestureHandling`. — [Map reference](https://developers.google.com/maps/documentation/javascript/reference/map)

**Converting pixels to LatLng**
- `Map.getProjection()` returns the world `Projection`, or `undefined` until the map initializes. You should listen for `projection_changed`. — [Map reference](https://developers.google.com/maps/documentation/javascript/reference/map)
- `OverlayView.getProjection()` returns a `MapCanvasProjection`:
  - `fromContainerPixelToLatLng`: "Computes the geographical coordinates from pixel coordinates in the map's container."
  - `fromDivPixelToLatLng`: pixel coordinates "in the div that holds the draggable map".
  - `fromLatLngToContainerPixel` and `fromLatLngToDivPixel` go the other way.
  - All take an optional `noClampNoWrap` boolean, which the page leaves undescribed.

  — [OverlayView reference](https://developers.google.com/maps/documentation/javascript/reference/overlay-view)
- `OverlayView.preventMapHitsAndGesturesFrom(element)` "Stops click, tap, drag, and wheel events on the element from bubbling up to the map". `preventMapHitsFrom` stops click or tap only. This is useful when a custom drawing overlay element must not trigger map gestures. — [OverlayView reference](https://developers.google.com/maps/documentation/javascript/reference/overlay-view)

**Live line and closing polygon**
- From the PolylineOptions/PolygonOptions docs:
  - "Inserting or removing LatLngs from the MVCArray will automatically update the polygon on the map" (same for polylines), so `polyline.getPath().push(latLng)` draws the stroke live.
  - Polygon paths "are closed automatically; do not repeat the first vertex".
  - "a polygon may consist of one or more paths".
  - `geodesic` defaults to false: "edges of the polygon are rendered as straight lines in screen space."
  - `clickable` "Indicates whether this Polygon handles mouse events". Set it to `false` on the in-progress stroke so it doesn't swallow events.

  — [Polygon/Polyline reference](https://developers.google.com/maps/documentation/javascript/reference/polygon)

**Example code in the wild**
- Classic (mouse-only) community recipe, GeekyAnts:
  - `addDomListener(mapDiv, 'mousedown', ...)` starts the stroke.
  - `map.addListener('mousemove', e => poly.getPath().push(e.latLng))` extends it.
  - `addListenerOnce(map, 'mouseup', ...)` removes the move listener, reads the path, calls `poly.setMap(null)` and builds `new google.maps.Polygon({path})`.
  - Dragging is disabled by binding `draggable={!isDrawable}`.
  - It does not handle touch.

  — [GeekyAnts tutorial](https://techblog.geekyants.com/a-brief-how-to-on-freehand-sketching-on-google-maps)
- Terra Draw's Google adapter (v1.7.0) shows a production pattern:
  - It creates a no-op `new google.maps.OverlayView()` solely to obtain the projection, and fires 'ready' from `onAdd`.
  - It listens to DOM `pointerdown`, `pointermove` and `pointerup` on the map element, and uses `setPointerCapture`/`releasePointerCapture`.
  - It computes `offsetX = event.clientX - mapDiv.getBoundingClientRect().left` (same for Y), then calls `overlay.getProjection().fromContainerPixelToLatLng(new google.maps.Point(offsetX, offsetY))`. It uses `document.fullscreenElement` when in fullscreen.
  - It toggles panning with `map.setOptions({ draggable: enabled })`, which is the deprecated option.
  - It renders features through a `google.maps.Data` layer.

  — [terra-draw-google-maps-adapter.ts](https://github.com/JamesLMilner/terra-draw/blob/main/packages/terra-draw-google-maps-adapter/src/terra-draw-google-maps-adapter.ts)
- Terra Draw's base adapter ignores non-primary pointers. The code comment says "We don't support multitouch as this point in time" (`if (!event.isPrimary) return`). — [base.adapter.ts](https://github.com/JamesLMilner/terra-draw/blob/main/packages/terra-draw/src/common/base.adapter.ts)

**Simplifying and fixing the shape**
- `turf.simplify(geojson, {tolerance=1, highQuality=false, mutate=false})` "Uses the 2d version of simplify-js". Its tolerance is in coordinate units, effectively degrees for lng/lat; the docs' example uses 0.01 and 0.005. — [Turf simplify](https://turfjs.org/docs/api/simplify)
- `turf.unkinkPolygon(geojson)` "Takes a kinked polygon and returns a feature collection of polygons that have no kinks" (uses simplepolygon internally). — [Turf unkinkPolygon](https://turfjs.org/docs/api/unkinkPolygon)
- Terra Draw ships a `ValidateNotSelfIntersecting` validation, in `validations/not-self-intersecting.validation.ts`, which rejects self-intersecting polygons. — [Terra Draw modes guide](https://github.com/JamesLMilner/terra-draw/blob/main/guides/4.MODES.md); [validations dir](https://github.com/JamesLMilner/terra-draw/tree/main/packages/terra-draw/src/validations)

**Google's custom-drawing example**
- vis.gl/react-google-maps has a `drawing` example that "shows how to build custom drawing tools using Maps JavaScript API overlays to draw shapes or markers on the map", with undo/redo. — [react-google-maps examples/drawing](https://github.com/visgl/react-google-maps/tree/main/examples/drawing)

### Inferences
Below is a minimal recipe. It is assembled from the documented APIs above and has not been tested by me.

```ts
const { Map, OverlayView, Polyline, Polygon } =
  await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
await google.maps.importLibrary('geometry');

// 1) Projection helper (needed because map.getProjection() gives world coords, not container pixels)
class ProjHelper extends OverlayView { onAdd() {} draw() {} onRemove() {} }
const proj = new ProjHelper(); proj.setMap(map);  // wait for onAdd/draw before using getProjection()

// 2) Enter "なぞる" mode
function startTrace() {
  map.setOptions({ gestureHandling: 'none', keyboardShortcuts: false, clickableIcons: false });
  overlayEl.style.display = 'block';  // transparent <div> absolutely positioned over map.getDiv(), CSS: touch-action:none
}

let stroke: google.maps.Polyline | null = null;
overlayEl.addEventListener('pointerdown', e => {
  if (!e.isPrimary) return;
  overlayEl.setPointerCapture(e.pointerId);
  stroke = new Polyline({ map, clickable: false, strokeWeight: 3, path: [toLatLng(e)] });
});
overlayEl.addEventListener('pointermove', e => {
  if (!stroke) return;
  // Optional: throttle with requestAnimationFrame and/or skip points closer than N px (cf. Terra Draw minDistance=20)
  stroke.getPath().push(toLatLng(e));
});
overlayEl.addEventListener('pointerup', finish);
overlayEl.addEventListener('pointercancel', cancel);

function toLatLng(e: PointerEvent) {
  const r = map.getDiv().getBoundingClientRect();
  return proj.getProjection().fromContainerPixelToLatLng(
    new google.maps.Point(e.clientX - r.left, e.clientY - r.top))!;
}

function finish() {
  // 3) Simplify + fix kinks (turf works on GeoJSON [lng, lat] rings: close the ring, then simplify/unkink)
  // 4) const area = new Polygon({ map, paths: simplifiedLatLngs, clickable: false, fillOpacity: 0.15 });
  // 5) map.setOptions({ gestureHandling: 'greedy' /* or previous value */ }); overlayEl.style.display = 'none';
  // 6) Filter results: google.maps.geometry.poly.containsLocation(pt, area), or send polygon to backend
}
```

Notes on the recipe:
- Use a transparent overlay element with CSS `touch-action: none` during trace mode. This keeps one-finger gestures away from both the map and page scrolling, which matters on iOS Safari and on pages using `cooperative`/`auto` gesture handling. The same "set touch-action: none on map element so browser doesn't consume touch gestures" approach was proposed for Terra Draw ([issue #826](https://github.com/JamesLMilner/terra-draw/issues/826)). `preventMapHitsAndGesturesFrom(overlayEl)` is an alternative if the element lives inside an OverlayView pane.
- Using Pointer Events instead of the map's `mousemove` events is the safer choice for mobile web. Map mouse events are designed around mouse input, and community tutorials that use them ignore touch. Terra Draw's Google adapter uses DOM pointer events for the same reason (see adapter code above).
- After `finish()`, simplify before building the polygon. Raw pointermove streams produce hundreds of vertices. This bloats URL/backend payloads and slows `containsLocation` loops. Terra Draw's freehand mode defaults to a 20 px `minDistance` between points.
- For a "close the loop" UX like the Japanese app, auto-close on finger lift, which Polygon does implicitly. If the lasso crosses itself, either unkink it (keeping all pieces as a MultiPolygon) or take a convex hull. The convex hull is simpler but over-includes area.

### Gaps
- I found no Google document stating whether `map.addListener('mousemove')` fires during one-finger touch drags on mobile browsers. The pointer-event approach avoids depending on it.
- With `gestureHandling: 'none'`, the docs don't say whether one-finger drags over the map then scroll the page. That's why the overlay plus `touch-action: none` is recommended (inference).
- I found no authoritative Stack Overflow answer with tested 2025-2026 touch freehand code for Google Maps. The search returned only older mouse-based tutorials.

## Q4. What do open-source libraries offer (Terra Draw, deck.gl editable layers, vis.gl React)?

### Takeaway
Terra Draw is the de facto, Google-endorsed option.
- Current versions: `terra-draw` 1.39.0 (28 Oct 2026) and `terra-draw-google-maps-adapter` 1.7.0 (6 Oct 2026).
- It has a built-in `TerraDrawFreehandMode` ('freehand'). Since 1.25.0 (18 Feb 2026), that mode supports `drawInteraction: 'click-drag'`, i.e. press-drag-release lasso drawing.
- Smoothing and auto-close options make it close to the "なぞる" UX on desktop.
- Its docs still say freehand is "not currently supported" on touch devices, and multi-touch support was not merged. Mobile web needs real-device testing.

deck.gl-community editable-layers has a lasso-style `DrawPolygonByDraggingMode`, but deck.gl's `GoogleMapsOverlay` does not support drag gesture callbacks. vis.gl/react-google-maps ships an official Terra Draw example that includes freehand.

### Cited Findings
**Terra Draw versions and setup**
- Current package versions in the repo (HEAD on 28 Oct 2026):
  - `terra-draw` 1.39.0, released 2026-10-28.
  - `terra-draw-google-maps-adapter` 1.7.0, released 2026-10-06, with peerDependencies `terra-draw ^1.0.0` and `@googlemaps/js-api-loader ^1.14.3 || ^2.0.0`.

  — [terra-draw CHANGELOG](https://github.com/JamesLMilner/terra-draw/blob/main/packages/terra-draw/CHANGELOG.md); [adapter CHANGELOG](https://github.com/JamesLMilner/terra-draw/blob/main/packages/terra-draw-google-maps-adapter/CHANGELOG.md)
- Terra Draw supports Google Maps alongside Leaflet, MapLibre, Mapbox, OpenLayers and ArcGIS. Google adapter requirements are:
  1. an `apiKey` when loading the library;
  2. "The map element must have a id property set";
  3. "Because an OverlayView is created, which can only be done asynchronously, you _must_ wait for the 'ready' event on the draw instance".

  The guide's Google example sets `draw.setMode("freehand")` on ready. — [Terra Draw adapters guide](https://github.com/JamesLMilner/terra-draw/blob/main/guides/3.ADAPTERS.md)
- Google's official sample:
  - Loads `terra-draw` and `terra-draw-google-maps-adapter` (UMD via unpkg `@latest`).
  - Creates `new TerraDraw({ adapter: new TerraDrawGoogleMapsAdapter({ map, lib: google.maps, coordinatePrecision: 9 }), modes: [...] })` inside a `projection_changed` listener, calls `draw.start()` and waits for `'ready'`.
  - Includes Select, Point, LineString, Polygon, Rectangle, Circle and Freehand modes, with a button that calls `draw.setMode('freehand')`.
  - Reads output via `draw.on('change', ...)` as GeoJSON.
  - Uses a `mapId` (`'c306b3c6dd3ed8d9'`).
  - Source: googlemaps/js-api-samples `samples/map-drawing-terradraw`.

  — [Google sample](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw)
- Terra Draw modes: Circle, Freehand (`freehand`), Freehand LineString (`freehand-linestring`), LineString, Point, Polygon, Rectangle, Angled Rectangle, Sector, Sensor, PolyLine, Marker, Select, Render and Static. — [Terra Draw modes guide](https://github.com/JamesLMilner/terra-draw/blob/main/guides/4.MODES.md)

**TerraDrawFreehandMode options**
- Source as of 1.39.0:
  - `minDistance` (default 20)
  - `smoothing` (default 0, linear interpolation)
  - `preventPointsNearClose` (default true)
  - `autoClose` (default false)
  - `autoCloseTimeout` (default 500 ms)
  - `keyEvents` (cancel = Escape, finish = Enter; `null` disables them)
  - `drawInteraction` (default `"click-move"`)
  - styling, plus `showCoordinatePoints`

  In drag mode, `onDragStart` calls `setMapDraggability(false)`, and `onDragEnd` closes the polygon and calls `setMapDraggability(true)`. — [freehand.mode.ts](https://github.com/JamesLMilner/terra-draw/blob/main/packages/terra-draw/src/modes/freehand/freehand.mode.ts)
- Freehand feature history:
  - "support draw interactions for freehand mode (#819)" and "smoothing option for freehand (#820)" landed in terra-draw 1.25.0 (2026-02-18).
  - "support drawInteraction for freehand linestring mode (#952)" and "support coordinate points in freehand modes (#954)" landed in 1.34.0 (2026-09-17).

  — [terra-draw CHANGELOG](https://github.com/JamesLMilner/terra-draw/blob/main/packages/terra-draw/CHANGELOG.md)
- `drawInteraction` values:
  - `"click-move"`: "Click-move-click only (default)".
  - `"click-drag"`: "Click-and-drag only", with use case "Touch-friendly or streamlined drawing experiences".
  - `"click-move-or-drag"`: both.

  — [Terra Draw modes guide](https://github.com/JamesLMilner/terra-draw/blob/main/guides/4.MODES.md)

**Touch support is unclear**
- The "Touch Device Support" section of the same guide says: "Currently on touch devices Select, Point, Line and Polygon Modes are fully supported. Circle, Rectangle and Angled Rectangle Modes work with the caveat with the UX is not ideal. Freehand is not currently supported. Currently on terradraw.io Circle, Rectangle and Freehand modes are disabled on smaller devices." — [Terra Draw modes guide](https://github.com/JamesLMilner/terra-draw/blob/main/guides/4.MODES.md)
  - This contradicts, or at least predates, the "Touch-friendly" `click-drag` option.
- Issue #827 (Mar 2026) is a request for "Mobile long-press + drag freehand drawing mode (touch-first UX)". The use case is literally "mobile map-based real estate area search, where users frequently sketch neighborhoods quickly". The maintainer replied by pointing to `drawInteraction`: "It allows you to do drag interactions for drawing for certain modes such as TerraDrawFreehandMode." The issue was closed in May 2026 for lack of follow-up. — [terra-draw issue #827](https://github.com/JamesLMilner/terra-draw/issues/827)
- Issue/PR #826 proposed multi-touch support: `pointerType`, an `inputFilter`, `touch-action: none` on the map element, and pinch/pan coexisting with one-finger drawing. It was closed on 2026-03-02 and not merged. A tester's iPad/iPhone Safari report on MapLibre marked "Freehand mode: 1-finger draw, 2-finger pinch/pan pause, lift to resume" as ❌ Fail. The current source has no `pointerType` or `inputFilter`. — [terra-draw issue #826](https://github.com/JamesLMilner/terra-draw/issues/826)

**React and Advanced Markers**
- vis.gl/react-google-maps has an official `examples/terra-draw`.
  - A `useTerraDraw` hook gets the map via `useMap()` and creates `new TerraDraw({ adapter: new TerraDrawGoogleMapsAdapter({ map, lib: google.maps, coordinatePrecision: 9 }), modes })` once `map.getProjection()` is set, or else on `projection_changed`. It calls `instance.start()` and `draw.stop()` on cleanup.
  - Its config includes `new TerraDrawFreehandMode(...)` with a 'Freehand' button.

  — [use-terra-draw.ts](https://github.com/visgl/react-google-maps/blob/main/examples/terra-draw/src/use-terra-draw.ts); [terra-draw-config.ts](https://github.com/visgl/react-google-maps/blob/main/examples/terra-draw/src/terra-draw-config.ts)
- The Terra Draw Google adapter detects `gmp-advanced-marker` elements and forwards pointer events from Advanced Markers. Changelog 1.4.0 (2026-05-03) mentions an Advanced Marker interaction property. — [adapter source](https://github.com/JamesLMilner/terra-draw/blob/main/packages/terra-draw-google-maps-adapter/src/terra-draw-google-maps-adapter.ts); [adapter CHANGELOG](https://github.com/JamesLMilner/terra-draw/blob/main/packages/terra-draw-google-maps-adapter/CHANGELOG.md)

**deck.gl**
- deck.gl-community editable-layers (repo version 9.4.8; successor to nebula.gl) has `DrawPolygonByDraggingMode`: "User can draw a new Polygon feature by dragging (similar to the lasso tool commonly found in photo editing software)", with a `throttleMs` option. — [editable-layers draw-modes docs](https://github.com/visgl/deck.gl-community/blob/master/docs/modules/editable-layers/api-reference/edit-modes/draw-modes.md)
- deck.gl's Google Maps integration lists as "Not supported features": "Gesture event callbacks (e.g. onDrag*)" and "Controller". — [deck.gl Google Maps overview](https://deck.gl/docs/api-reference/google-maps/overview)
- `GoogleMapsOverlay` interleaved mode applies to vector maps and shares Google's WebGL2 context, with no multisampling. — [GoogleMapsOverlay docs](https://deck.gl/docs/api-reference/google-maps/google-maps-overlay)

### Inferences
- For the "なぞる" pattern, configure Terra Draw like this:

  ```ts
  new TerraDrawFreehandMode({ drawInteraction: 'click-drag', smoothing: 0.x, minDistance: ... })
  ```

  Then call `draw.setMode('freehand')` when the user taps the button, and listen for the `finish` event to read the GeoJSON polygon via `draw.getSnapshotFeature(id)` (or the `change` event). This gives press-drag-release lasso drawing with automatic map-pan locking on desktop. On mobile web it may work, because the adapter uses Pointer Events and the primary pointer, but the maintainer's own docs say freehand touch is unsupported. Treat it as "test on iOS Safari/Android Chrome before committing".
- Because the adapter toggles the deprecated `draggable` option rather than `gestureHandling`, a `gestureHandling: 'greedy'` or `'cooperative'` map might still respond to pinch or two-finger gestures mid-draw. A wrapper that also sets `gestureHandling: 'none'` while in trace mode is a cheap safeguard.
- deck.gl's `DrawPolygonByDraggingMode` is a poor fit on Google Maps, since `GoogleMapsOverlay` doesn't support `onDrag*` callbacks. It's better suited to MapLibre/Mapbox (covered by the alternatives researcher).
- The custom recipe (Q3) and Terra Draw are not mutually exclusive. You could use Terra Draw for desktop and the custom overlay plus Pointer Events path on touch if Terra Draw's freehand proves unreliable on mobile.

### Gaps
- I found no official confirmation, such as a changelog, docs update or test, that `TerraDrawFreehandMode` with `drawInteraction: 'click-drag'` works reliably on touch with the Google Maps adapter specifically. The touch-support doc text appears stale (issue #107 dates from 2023).
- I didn't verify whether Google's sample uses `drawInteraction: 'click-drag'` for its freehand button. My fetch tool couldn't return the full source.

## Q5. How does google.maps.geometry.poly.containsLocation work for filtering points, and what are its limits?

### Takeaway
`google.maps.geometry.poly.containsLocation(point, polygon)` returns true when the point is inside the shape or on its edge. It accepts only a `google.maps.Polygon`, `Circle` or `CircleLiteral`, not raw arrays or GeoJSON, and needs the geometry library loaded. Google doesn't document how it treats holes or multiple paths, or whether edges are geodesic or planar. It's fine for client-side filtering of an already-fetched result set, but the polygon should be sent to the backend for real search.

### Cited Findings
- Signature: `containsLocation(point: LatLng|LatLngLiteral, polygon: Polygon|Circle|CircleLiteral): boolean`, described as "Computes whether the given point lies inside the specified polygon or circle." A Circle needs `center` and a non-negative `radius`. — [Geometry reference](https://developers.google.com/maps/documentation/javascript/reference/geometry); [@types/google.maps latest](https://unpkg.com/@types/google.maps@latest/index.d.ts)
- Guide: "The function returns true if the point is within the shape or on its edge." — [Geometry library guide](https://developers.google.com/maps/documentation/javascript/geometry)
- `isLocationOnEdge(point, poly, tolerance?)` returns true when the lat/lng difference to the closest edge point is under a tolerance, by default 10^-9 degrees. — [Geometry reference](https://developers.google.com/maps/documentation/javascript/reference/geometry)
- The geometry library "is not loaded by default". Load it with `libraries=geometry`, or with `importLibrary('geometry')` under the dynamic loader. — [Geometry guide](https://developers.google.com/maps/documentation/javascript/geometry)
- Only the `spherical` namespace is described as geodesic: "Utility functions for computing geodesic angles, distances and areas." The `poly` functions carry no geodesic or planar statement, and the reference never mentions holes or multiple paths. — [Geometry reference](https://developers.google.com/maps/documentation/javascript/reference/geometry)
- `spherical.computeArea(path)` returns square meters by default. Use it to cap a drawn area, e.g. reject huge lassos. — [Geometry reference](https://developers.google.com/maps/documentation/javascript/reference/geometry)
- `PolygonOptions.geodesic` defaults to false: "edges ... rendered as straight lines in screen space". Polygons may have multiple paths, and the Polygon docs say the Data layer "offers a simpler way of creating holes". — [Polygon reference](https://developers.google.com/maps/documentation/javascript/reference/polygon)

### Inferences
- Terra Draw outputs GeoJSON, and Turf works on GeoJSON. To use `containsLocation`, build a `new google.maps.Polygon({ paths })`; it doesn't have to be added to the map. Or skip Google and use `turf.booleanPointInPolygon`, which handles GeoJSON Polygon/MultiPolygon with holes and so pairs naturally with `unkinkPolygon` output.
- For neighborhood-scale lassos (a few km), geodesic vs. screen-straight edges makes a negligible difference. It matters only for very large shapes.
- Client-side `containsLocation` over N points is O(N × vertices). Simplifying the lasso first, or using a bounding-box prefilter with `LatLngBounds`, keeps it fast. Real "results only inside the shape" should send the polygon to the backend (another researcher's scope).

### Gaps
- Google doesn't document how `containsLocation` treats polygons with holes or multiple paths, or whether its edge test is geodesic, rhumb or planar. I could not test it because I had no API key.

## Q6. Google Maps-specific gotchas: Advanced Markers, vector/WebGL, mobile web touch, gestureHandling, iOS Safari

### Takeaway
The main gotchas:
- Use `gestureHandling` rather than the deprecated `draggable` to lock the map.
- Default `auto`/`cooperative` handling on scrollable mobile pages means one finger scrolls the page, which fights a one-finger trace.
- Wait for the projection or OverlayView before converting pixels.
- Advanced Markers and the Data layer can swallow pointer events.
- Vector maps can tilt and rotate, which affects pixel-to-LatLng mapping. Use the projection API rather than hand-rolled Mercator math.

### Cited Findings
- `gestureHandling: "cooperative"`: "Two-finger touch gestures pan and zoom the map, while scroll and one-finger gestures scroll the page." `"auto"` (default) picks cooperative or greedy "depending on whether the page is scrollable or in an iframe." — [Map reference](https://developers.google.com/maps/documentation/javascript/reference/map)
- Release notes: 3.60.8 (9 Apr 2025) increased the opacity of the Cooperative Gesture Handling overlay; 3D Maps got cooperative gesture handling in 3.62.11d (23 Oct 2025). — [Release notes](https://developers.google.com/maps/documentation/javascript/releases)
- `renderingType` (RASTER/VECTOR) "cannot be set or changed after a map is instantiated", and vector maps may fall back to raster on some devices. — [Map reference](https://developers.google.com/maps/documentation/javascript/reference/map)
- `MapCanvasProjection.getWorldWidth` notes behavior "for projections with a heading angle of either 90 or 270 degrees", so the projection accounts for heading on vector maps. — [OverlayView reference](https://developers.google.com/maps/documentation/javascript/reference/overlay-view)
- Google's Terra Draw sample sets `tilt: 45` and a `mapId`. — [Google sample](https://developers.google.com/maps/documentation/javascript/examples/map-drawing-terradraw)
- `Map.getProjection()` is undefined until initialization, so wait for `projection_changed`. Terra Draw on Google must wait for its `'ready'` event (OverlayView `onAdd`). — [Map reference](https://developers.google.com/maps/documentation/javascript/reference/map); [Terra Draw adapters guide](https://github.com/JamesLMilner/terra-draw/blob/main/guides/3.ADAPTERS.md)
- The Terra Draw Google adapter adds special pointerdown/pointermove forwarding for `gmp-advanced-marker` elements. Its source comment says "Clicking on data geometries ... swallows the map onclick event, so we need to forward it", showing that Advanced Markers and Data-layer features intercept pointer events. — [adapter source](https://github.com/JamesLMilner/terra-draw/blob/main/packages/terra-draw-google-maps-adapter/src/terra-draw-google-maps-adapter.ts)
- `clickableIcons: false` stops POI icons from being clickable, which avoids POI info windows opening when a trace starts on a POI. — [Map reference](https://developers.google.com/maps/documentation/javascript/reference/map)
- `OverlayView.preventMapHitsAndGesturesFrom(el)` stops click, tap, drag and wheel events on `el` from reaching the map. — [OverlayView reference](https://developers.google.com/maps/documentation/javascript/reference/overlay-view)
- iOS Safari multi-touch freehand on MapLibre failed in Terra Draw's own tester report (1-finger draw with 2-finger pinch/pan pause). Mixing pan/zoom with drawing on touch is unsolved in that library. — [terra-draw issue #826](https://github.com/JamesLMilner/terra-draw/issues/826)
- deck.gl on Google Maps doesn't support `onDrag*` gesture callbacks or a Controller, which limits WebGL-overlay-based drag drawing. — [deck.gl Google Maps overview](https://deck.gl/docs/api-reference/google-maps/overview)

### Inferences
- Recommended UX on mobile web is a modal "trace mode", like the Japanese app's なぞる button:
  1. On tap, set `gestureHandling: 'none'` and `clickableIcons: false`, and show a full-map transparent overlay with `touch-action: none`.
  2. One finger draws. Ignore non-primary pointers, and cancel on `pointercancel`.
  3. On lift, close the polygon, restore the previous `gestureHandling`, hide the overlay, and run the search.
  4. Provide a "redraw/clear" button.

  This sidesteps the cooperative/greedy conflict and iOS page-scroll and rubber-band issues entirely, because pan/zoom is simply unavailable during the stroke.
- Draw the live stroke with `google.maps.Polyline`, which works on raster and vector maps. WebGLOverlayView or deck.gl is unnecessary for a single lasso stroke and adds complexity.
- Hide or dim Advanced Marker clusters during trace mode, or ensure the overlay sits above them, so a stroke starting on a marker doesn't get eaten by the marker's click handling.

### Gaps
- I found no Google documentation specifically about iOS Safari touch behavior (page scroll, rubber-banding, 300 ms tap delay) for the Maps JS API. The iOS guidance above is inference plus Terra Draw issue evidence, not Google-sourced.
- I found no Google statement on whether `gestureHandling: 'none'` also lets one-finger drags scroll the host page.
