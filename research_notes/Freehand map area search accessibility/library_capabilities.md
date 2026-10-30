# Library accessibility capabilities and gaps: Google Maps JS API, Terra Draw (+ Google Maps adapter), @googlemaps/markerclusterer, @vis.gl/react-google-maps (as of 2026-10-29)

Method note: Docs were read on 2026-10-29. Google pages showed "Last updated 2026-10-28". Where docs say nothing, I read source code:
- Terra Draw `main` @ `4a8cfa2` (2026-10-28; npm `terra-draw` 1.39.0, `terra-draw-google-maps-adapter` 1.7.0)
- js-markerclusterer `main` @ `3a887f2` (2026-10-26; npm latest is still 2.6.2)
- visgl/react-google-maps `main` @ `b9734e5` (2026-10-28; npm 1.10.1)

For Google Maps JS I read the **minified** modules of the weekly build the API served without a key on 2026-10-29: version **3.66.12d**, base URL `https://maps.googleapis.com/maps-api-v3/api/js/66/12d/`. Identifiers in that code are obfuscated, so claims drawn from it are labelled "(minified source)". They describe one weekly build and Google can change them without notice.

## 1. Google Maps JS API: map-level keyboard support, focus, accessible name, screen readers, gestureHandling vs keyboard, release notes, known issues

### Takeaway
The base map gives you a fair amount for free:
- It is a focusable `role="region"` labelled "Map" with `aria-roledescription="map"`.
- When focused, it supports arrow-key pan, +/- zoom, Home/End/PageUp/PageDown 75% jumps, and Shift+arrow rotate/tilt where enabled.
- It has a "Keyboard shortcuts" button and dialog that screen readers announce.
- Only `keyboardShortcuts:false` turns keyboard support off. **`gestureHandling:'none'` does not disable keyboard pan or zoom.** It is not referenced in the keyboard handler.

There is no MapOptions property for a custom accessible name or description. Google publishes no ACR/VPAT for Maps.

### Cited Findings
**Default keyboard behaviour and options**
- Keyboard handling is on by default. The Controls guide says "keyboard handling is on by default on all devices". It also says disabling the default UI does not affect mouse gestures or keyboard shortcuts on the base map, which are governed by `gestureHandling` and `keyboardShortcuts`. — [Controls guide](https://developers.google.com/maps/documentation/javascript/controls)
- MapOptions reference text:
  - `keyboardShortcuts`: "If `false`, prevents the map from being controlled by the keyboard. Keyboard shortcuts are enabled by default."
  - `gestureHandling` "none": "The map cannot be panned or zoomed by user gestures."
  - The MapOptions and Map class sections have no accessibility, ARIA, label, description or `focus()` option. — [Map reference](https://developers.google.com/maps/documentation/javascript/reference/map)
- The "Controlling Zoom and Pan" guide covers this:
  - It describes `none` only as "Disables gestures on the map".
  - To "entirely disable" pan and zoom it says to set `gestureHandling:"none"` and `zoomControl:false`.
  - It says nothing about the keyboard. — [Interaction guide](https://developers.google.com/maps/documentation/javascript/interaction)
- **Shortcut list (minified source).** The shortcut-dialog table defines:

  | Key | Action |
  |---|---|
  | Left / Right / Up / Down (keyCodes 37–40) | "Move left/right/up/down" |
  | + (107) | "Zoom in" |
  | - (109) | "Zoom out" |
  | Home (36) | "Jump left by 75%" |
  | End (35) | "Jump right by 75%" |
  | PageUp (33) | "Jump up by 75%" |
  | PageDown (34) | "Jump down by 75%" |
  | Shift+Left / Shift+Right | Rotate, only when rotation is enabled |
  | Shift+Up / Shift+Down | Tilt, only when tilt is enabled |

  — [util.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/util.js)
- **Keyboard handler gating (minified source).** The handler listens for keydown, keypress and keyup on the map's interactive container. It also handles `=`/`+` and `-`/`_` by `which` code. It ignores an event in three cases:
  - the event target is not the container itself,
  - Ctrl, Alt or Meta is pressed,
  - its `enabled` flag is false. That flag is bound to `keyboardShortcuts`.

  `controls.js` never refers to `gestureHandling`. So `gestureHandling:'none'` leaves arrow-key and +/- pan and zoom working, and only `keyboardShortcuts:false` turns them off. — [controls.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/controls.js)
- A third-party course says the same thing: users "can still interact with the map using keyboard shortcuts" unless `keyboardShortcuts:false` is set. — [DevPath course page](https://www.devpath.com/courses/google-maps-api-beginners/disable-default-controls) (secondary source; agrees with the minified source above)

**Focus, accessible name and screen-reader text**
- **Map container semantics (minified source).** The inner interactive container gets:
  - `aria-label="Map"`, a hard-coded string,
  - `role="region"`,
  - `aria-roledescription="map"`,
  - `tabIndex = 0` when `keyboardShortcuts` is undefined or true, and `-1` when it is false. In that case the map leaves the Tab order.

  — [common.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/common.js); [map.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/map.js)
- A release fix from 2021 (v3.47.1) stopped the map taking Tab focus when `keyboardShortcuts` is false. I saw this only in a search-result summary of the release archive. — [Release notes archive](https://developers.google.com/maps/documentation/javascript/releases-archive) (via search snippet; consistent with the source above)
- **Touch instruction (minified source).** The map container is linked by `aria-describedby` to a hidden description. On touch-capable devices the API adds the sentence "To navigate the map with touch gestures double-tap and hold your finger on the map, then drag the map." It adds this only when `gestureHandling !== "none"`, so that sentence is removed when gestureHandling is `none`. — [map.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/map.js)
- **Marker instruction (minified source).** When interactive markers exist, the map also announces "To navigate, press the arrow keys." — [map.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/map.js)
- **Keyboard shortcuts control (minified source).** It is rendered as a button with the text "Keyboard shortcuts", and its icon has `alt=""`. The dialog is titled "Keyboard shortcuts". — [controls.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/controls.js)

**Accessibility history from Google's blog posts**
- **2021** (Chris J. Shull, Jun 15 2021):
  - Tab order is left-to-right and top-to-bottom.
  - Space activates buttons.
  - Each map gets screen-reader descriptions.
  - Controls got higher colour contrast.
  - A new keyboard shortcuts dialog shows key controls, which "take effect when the map is focused".
  - The post says "we know we have much more work to do."

  — [Improved accessibility in the Maps JavaScript API](https://mapsplatform.google.com/resources/blog/improved-accessibility-maps-javascript-api/)
- **2022** (Aleh Medzviadziuk, Jun 21 2022):
  - Buttons and checkboxes are visible in high-contrast mode.
  - InfoWindow gained an `ariaLabel` option and a programmatic `focus()`.
  - Screen readers now read instructions for keyboard navigation of interactive markers.

  — [Latest accessibility updates](https://mapsplatform.google.com/resources/blog/latest-accessibility-updates-maps-javascript-api/)
- **2023** (May 18 2023):
  - Draggable Advanced Markers can be moved by keyboard (arrow keys move, Enter drops, Esc cancels) or by single pointer (long-press, then click to drop).
  - The shortcuts dialog shows tilt and rotate keys on vector maps.
  - "A screen reader reads keyboard shortcuts when a focus is set on the map."

  — [2023 Accessibility updates](https://mapsplatform.google.com/resources/blog/2023-accessibility-updates-maps-javascript-api/)

**Accessibility-related release notes, 2023–2026**

2023–2024 — [Release notes archive](https://developers.google.com/maps/documentation/javascript/releases-archive):

| Version (date) | Change |
|---|---|
| 3.54.1 (Aug 18 2023) | Fixed focus being lost when zoom buttons are disabled at the zoom limits |
| 3.54.10 (Oct 18 2023, beta) | `MapElement` (`<gmp-map>`) now has `delegatesFocus` |
| 3.55.7 (Jan 11 2024) | Fixed pan and zoom keyboard shortcuts not working after clicking on the map |
| 3.55.8 (Jan 18 2024) | Introduces `gmpClickable` on `AdvancedMarkerElement` |
| 3.55.9 (Jan 25 2024, beta) | Fixed the shortcuts dialog not closing on key press |
| 3.56.1 (Feb 22 2024) | Deprecated `google.maps.Marker` |
| 3.56.10 / 3.57.9 (2024) | Keyboard and single-pointer accessibility for the Pegman control |
| 3.58.8 (Oct 10 2024) | Fixed Chrome wrongly showing a blue focus line around the map |
| 3.58.11a (Oct 31 2024) | Fixed screen readers focusing a hidden scroll message on Embed maps |

2025–2026 — [Release notes](https://developers.google.com/maps/documentation/javascript/releases):

| Version (date) | Change |
|---|---|
| 3.59.4a (Jan 9 2025) | Fixed PlaceAutocompleteElement not yielding focus correctly |
| 3.60.8 (Apr 9 2025) | Made the cooperative gesture-handling overlay more opaque so its text meets contrast requirements |
| 3.61.9a (Jul 10 2025) | Stopped markers repeating navigation instructions on each item for screen readers |
| 3.61.9a (Jul 10 2025) | Fixed a contrast issue in the keyboard shortcut dialog in dark mode |
| 3.62.2c (Aug 28 2025) | "The Drawing Library is deprecated." |
| 3.63.5d (Dec 11 2025) | Improved contrast of the Google logo on custom-styled maps |
| 3.64.11d (Apr 29 2026) | Added a focus-ring CSS Shadow Part and a `description` property to the Place Autocomplete elements |
| 3.65.1c (May 20 2026) | Improved accessibility of the "Report a map error" links |
| 3.65.3b (Jun 4 2026) | "The DrawingManager functionality … is no longer available." |
| 3.65.3b (Jun 4 2026) | Improved contrast of the copyright dialog in dark mode |
| 3.65.12f (Aug 6 2026) | Unique accessible names for "More Options" buttons in Place Details widgets |
| 3.66.4d (Sep 9 2026) | Deprecated `AdvancedMarkerElement.addListener()` and the legacy `click`/`drag*` events |
| 3.66.7 (Oct 1 2026) | Route3DElement markers are keyboard-reachable and announced by screen readers |
| 3.66.8b (Oct 8 2026) | Fixed arrow-key navigation moving focus to AdvancedMarkerElements outside the visible map area |
| 3.66.9d (Oct 14 2026) | Fixed InfoWindow not closing with Esc and focus not returning to the previously focused element |

**Custom controls guidance**
- Google's advice is to use native HTML buttons and labels, "never repurpose a DIV as an interactive UI element", and label controls with `<label>`, `title` or `aria-label`. — [Controls guide](https://developers.google.com/maps/documentation/javascript/controls)

**Known issues**
- A long-standing public issue (Google issue 69541792) asked Google to make Maps API widgets WCAG-compliant. A 2018 WebAIM list post refers to it, and its current status could not be verified. — [WebAIM list archive](https://webaim.org/discussion/mail_message?id=37620)

### Inferences
- **Trace mode and the keyboard.** A trace mode that sets `gestureHandling:'none'` freezes touch and mouse pan only. A keyboard user who has the map focused can still pan and zoom with the arrows and +/-. This is probably desirable: it is a keyboard way to adjust the view while in trace mode. But if the app re-projects the drawn shape or overlay on every camera change, it has to listen to `bounds_changed`/`idle` even in trace mode.
- **Focus on the overlay.** The map keyboard handler only acts when the event target is the map's own container. If focus sits on the team's transparent drawing overlay or a marker, arrow keys will not pan the map. The overlay needs its own key handling, or focus has to go back to the map.
- **Accessible name.** The map's accessible name is fixed as "Map". A Japanese UI will hear an English "Map" unless the API's language parameter localizes it. I did not verify localization. To give the region a meaningful name, the team must add one on its own wrapper, for example a labelled `<section>`, or use `aria-describedby` on a wrapper.
- **Released vs. in progress.** Several fixes in late 2026 (offscreen marker focus, InfoWindow Esc and focus return) show marker and InfoWindow keyboard behaviour still changing. Pin a tested version (`v=3.66` or quarterly) rather than `weekly` for accessibility QA.

### Gaps
- No Google page documents the full keyboard shortcut list, or the gestureHandling-versus-keyboard interaction. Both answers above come from minified weekly code (3.66.12d) and should be confirmed in a browser.
- I could not verify whether the "Map" label and the hidden instructions are localized (`language=ja`).
- No Google Issue Tracker list of open Maps JS accessibility bugs was retrievable; the tracker needs JS or sign-in.
- Default control contrast was not measured.

## 2. AdvancedMarkerElement and legacy Marker accessibility

### Takeaway
An `AdvancedMarkerElement` becomes keyboard-focusable and gets `role="button"` once it is interactive. That happens when `gmpClickable:true` is set, or when a `click`/`gmp-click` listener is registered via the now-deprecated `addListener`. Once interactive:
- Tab reaches the first marker and arrow keys cycle through the rest.
- Enter or Space fires `gmp-click`.
- `title` becomes the screen-reader text.

Focusable children inside marker content (buttons, inputs, links) are explicitly unsupported. Legacy `google.maps.Marker` is deprecated but not scheduled for removal, and it needs `optimized:false` plus a click listener to be accessible.

### Cited Findings
**Google's documented behaviour (Make markers clickable and accessible guide)**
- Exact guide text:
  - "When a marker is clickable (or draggable), it can respond to keyboard and mouse input."
  - "Use the tab key to focus on the first marker"; "use the arrow keys to cycle through the markers"
  - "press the enter key to 'click'"
  - An info window opens with click, Enter or Space; when it closes, "focus will return to the associated marker"
  - "Text specified in the `title` option is readable by screen readers"
  - "Default markers meet the WCAG AA minimum size standard"; for AAA, increase `PinElement.scale`.
- The guide's sample uses `gmpClickable: true` with `addEventListener('gmp-click', …)`. It does not discuss ARIA or custom HTML content.

— [Make markers clickable and accessible](https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers)

**Reference definitions**
- `gmpClickable` (default `false`): "If `true`, the `AdvancedMarkerElement` will be clickable and trigger the `gmp-click` event, and will be interactive for accessibility purposes (e.g. allowing keyboard navigation via arrow keys)."
- `title`: "If provided, an accessibility text (e.g. for use with screen readers) will be added".
- `gmp-click` is "Only supported with `addEventListener()`".
- `addListener` and the `click` event are deprecated.

— [AdvancedMarkerElement reference](https://developers.google.com/maps/documentation/javascript/reference/advanced-markers)

**What the code does (minified source, `marker.js` 3.66.12d)**

All points below are from [marker.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/marker.js).
- **Interactive check.** The marker is treated as interactive if `gmpClickable` is true, or if a `"click"` or `"gmp-click"` listener is registered on the internal (MVC) event system. `gmp-click` is only dispatched when `gmpClickable` is true or such a listener exists.
- **Roles.** An interactive marker gets `role="button"`. A non-interactive marker with a `title` gets `role="img"`. Otherwise there is no role.
- **Focusable children.** If focus moves into a child element, the marker stops the event and logs "Focusable child elements in AdvancedMarkerElement are not supported. To make AdvancedMarkerElement focusable, use addListener() to register a "click" event…". It then moves focus away.
- **Keyboard drag instructions.** For draggable markers it adds hidden text: "To activate drag with keyboard, press Alt + Enter. Once in keyboard drag state, use the arrow keys to move the marker. To complete the drag, press the Enter key. To cancel, press Escape."
- **Deprecation warning.** `addListener` now always warns "Please use addEventListener with 'gmp-' events instead of addListener."

**Open issues showing the API in flux**
- **Conflicting console warnings.** `addListener('click')` warns to use `gmp-click`. Switching to `addEventListener('gmp-click')` without `gmpClickable` produces a warning to use `addListener`, and clicks don't fire. — [js-markerclusterer #1152 (open, Feb 2026)](https://github.com/googlemaps/js-markerclusterer/issues/1152)
- **Inputs inside markers.** An `<input>` inside an AdvancedMarker triggers the "Focusable child elements … not supported" message. — [react-google-maps #704 (open)](https://github.com/visgl/react-google-maps/issues/704)

**Legacy `google.maps.Marker`**
- "As of February 21st, 2024 (v3.56), google.maps.Marker is deprecated… At this time, google.maps.Marker is not scheduled to be discontinued."
- Accessibility guidance for legacy markers:
  - "You can make a marker accessible by adding a click listener event, and setting `optimized` to `false`."
  - The click listener gives "button semantics".
  - `title` supplies accessible text.
  - Tab and arrow-key navigation works the same as for Advanced Markers.

— [Markers (Legacy)](https://developers.google.com/maps/documentation/javascript/markers)
- The 2021 blog post says markers default to `role="img"`, or `"button"` when interactive, that `title` is the label, and that this "do[es] not apply to markers that are `optimized`." — [Improved accessibility blog](https://mapsplatform.google.com/resources/blog/improved-accessibility-maps-javascript-api/)

### Inferences
- **Recommended pattern for listing pins and cluster bubbles:**
  - Use `new AdvancedMarkerElement({gmpClickable:true, title:'…'})` and `addEventListener('gmp-click', …)`.
  - Never put buttons or links inside the marker content.
  - Put a full accessible name in `title`, for example 「物件 3件、タップで拡大」.
  - The visible SVG/HTML count is not guaranteed to be read, so `title` must carry the meaning.
- **Arrow-key order is Google's choice.** With hundreds of markers, a keyboard user has to arrow through every one. The team cannot set the order. Ordering exists internally, but I found no API to set it. A synchronized list view is the practical alternative.
- **Marker accessibility is per-marker only.** Nothing summarises "N results in the drawn area"; the app must announce that itself, for example with a live region.

### Gaps
- Exactly how `title` is exposed (as `aria-label` or a visually hidden span) was not confirmed in the minified code.
- How arrow-key order is decided (position or insertion order) is not documented.
- Whether Space as well as Enter fires `gmp-click` on a clickable marker without an InfoWindow: the guide only promises Enter for "click" and Enter/Space for an info window.

## 3. Polygons, Circles and Polylines (including editable shapes)

### Takeaway
`google.maps.Polygon`, `Circle` and `Polyline` are not keyboard-focusable and are not exposed to assistive technology. Editable vertices cannot be moved by keyboard. The only accessible element in the shape-editing module is an "Undo last edit" button. A drawn search area therefore needs its own text alternative and keyboard controls.

### Cited Findings
- The `poly` module (3.66.12d) contains no `tabindex`/`tabIndex`, no `focus`, no `keydown` handler and no `role` assignment. Its single `aria-` use is the shape-editing button: `title="Undo last edit"`, `aria-label="Undo last edit"`. (Minified source.) — [poly.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/poly.js)
- In the same module, dragging a shape is refused when the map has `draggable:false` or `gestureHandling:"none"`. (Minified source.) — [poly.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/poly.js)
- None of Google's accessibility blog posts (2021–2023) or release notes (2023–2026) lists any keyboard or screen-reader support for shapes. The 2023 post explicitly covers only Street View, draggable markers and the shortcuts dialog. — [2023 Accessibility updates](https://mapsplatform.google.com/resources/blog/2023-accessibility-updates-maps-javascript-api/); [Release notes](https://developers.google.com/maps/documentation/javascript/releases)

### Inferences
- The drawn freehand polygon is invisible to screen readers. The team must provide:
  - a text summary, such as "Search area drawn: about 1.2 km², 349 listings",
  - a "clear area" button and a "redraw" button,
  - a non-drawing alternative for choosing an area: station or area list, radius from a point, or a "search this visible area" button.
- Editable vertex handles (from `editable:true` or Terra Draw select mode) offer keyboard users nothing. Any "adjust the shape" feature needs a separate accessible method, for example a radius or step slider, or undo/redo buttons.

### Gaps
- I did not check whether vector-map rendering puts any shape semantics into a different module. The finding covers the `poly` module only.

## 4. Terra Draw (core + terra-draw-google-maps-adapter): keyboard events, keyboard drawing, ARIA, focus, issues

### Takeaway
Terra Draw offers only configurable keyboard *shortcuts*:
- **Drawing modes (including freehand):** `cancel` (Escape) and `finish` (Enter).
- **Select mode:** `deselect` (Escape), `delete` (Delete), `rotate` (Ctrl+R), `scale` (Ctrl+S).
- **Undo/redo:** optional shortcuts.

There is no keyboard-driven vertex placement, no ARIA, no `tabindex` and no focus management in the core or the Google adapter. The Google adapter's keyboard events only work when focus is inside `map.getDiv()`; this was fixed in adapter 1.1.2, Dec 2025. There are no accessibility issues in the repo, and Discussions are disabled.

### Cited Findings
**Freehand key handling**
- Freehand defaults are `defaultKeyEvents = { cancel: Escape, finish: Enter }`. Passing `keyEvents: null` disables both, and a partial object overrides defaults. — [freehand.mode.ts L50–53, L165–169](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw/src/modes/freehand/freehand.mode.ts)
- `onKeyUp` behaviour: the cancel key calls `cleanUp()`, which discards the in-progress shape. The finish key calls `close()` only `if (this.canClose === true)`. `onKeyDown` is a no-op. — [freehand.mode.ts L433–444](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw/src/modes/freehand/freehand.mode.ts)
- Other freehand options:

  | Option | Default |
  |---|---|
  | `minDistance` | 20 |
  | `smoothing` | 0 |
  | `autoClose` | false |
  | `autoCloseTimeout` | 500 |
  | `drawInteraction` | `"click-move"` |

  — [freehand.mode.ts L88–115](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw/src/modes/freehand/freehand.mode.ts)

**Other modes and shortcuts**
- Polygon, linestring, circle, rectangle, sector, sensor, angled-rectangle and ellipse modes all share the same `{cancel: Escape, finish: Enter}` defaults. Polygon mode's key handler only checks cancel and finish, so no key adds a vertex. — [polygon.mode.ts L54–57, L1005–1008](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw/src/modes/polygon/polygon.mode.ts)
- Select mode keys are `deselect: Escape`, `delete: Delete`, `rotate: ["Control","r"]`, `scale: ["Control","s"]`. — [select.mode.ts L60–72](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw/src/modes/select/select.mode.ts)
- An optional `TerraDrawUndoRedoKeyboardShortcuts` class provides undo/redo with configurable shortcuts. — [keyboard-shortcuts.ts](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw/src/undo-redo/keyboard-shortcuts.ts); [Events guide](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/guides/6.EVENTS.md)

**No accessibility code**
- A grep for `aria-`, `tabindex`, `setAttribute("role"` and `.focus(` across `packages/terra-draw/src` and `packages/terra-draw-google-maps-adapter/src` (excluding tests) returns zero hits. — [terra-draw repo @4a8cfa2](https://github.com/JamesLMilner/terra-draw/tree/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages)

**Google adapter keyboard target**
- The adapter attaches `keyup`/`keydown` to `this._map.getDiv()`. Pointer events go to a `div[style*="z-index: 3;"]` found by a selector the author calls "a bit hacky". — [terra-draw-google-maps-adapter.ts L541–560](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw-google-maps-adapter/src/terra-draw-google-maps-adapter.ts); [base.adapter.ts L385–430](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw/src/common/base.adapter.ts)

**Keyboard bugs with Google Maps**
- **#703 (2025):** keyboard events did not fire with the Google Maps adapter, because listeners were not on the element that receives focus in Google Maps. It was fixed in adapter 1.1.2 (2025-12-02, "fix keyboard events not firing when map is focused (#734)"). — [Issue #703](https://github.com/JamesLMilner/terra-draw/issues/703); [adapter CHANGELOG](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw-google-maps-adapter/CHANGELOG.md)
- **#129 (2023):** the maintainer observed that "Google Maps seems to swallow all keyboard events… By default it also seems to set the focused element to the `body`." — [Issue #129](https://github.com/JamesLMilner/terra-draw/issues/129)
- **#40 (2023):** a blanket `preventDefault` swallowed keys for inputs nested in the map; this was fixed. — [Issue #40](https://github.com/JamesLMilner/terra-draw/issues/40)

**Issue search results**
- A GitHub issue search for "accessibility" in JamesLMilner/terra-draw returned no results. "Keyboard" issues are only #5, #6, #29, #40, #129, #325, #600 and #703, all closed, and none asks for keyboard-only drawing. — [terra-draw issues](https://github.com/JamesLMilner/terra-draw/issues?q=keyboard)
- Repo Discussions are disabled (API: "Discussions are disabled for this repo"). — [terra-draw repo](https://github.com/JamesLMilner/terra-draw)

**Docs on touch and drawInteraction**
- The modes guide says: "All modes work with keyboard and mouse interface." In context this means keyboard shortcuts alongside a mouse; there is no keyboard-only drawing. The same guide says "on touch devices… Freehand is not currently supported", and that terradraw.io disables Freehand on small devices. — [4.MODES.md](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/guides/4.MODES.md)
- That touch statement may be outdated. `drawInteraction` support for freehand landed in 1.25.0 (2026-02-18), and the guide's own `drawInteraction` table describes `"click-drag"` as "Touch-friendly". — [terra-draw CHANGELOG](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/packages/terra-draw/CHANGELOG.md); [4.MODES.md drawInteraction table](https://github.com/JamesLMilner/terra-draw/blob/4a8cfa2ef2dece2284dd06aa71ed0023d84a5cfb/guides/4.MODES.md)

### Inferences
- With Terra Draw, the team gets Esc to cancel and Enter to finish, but only while focus is inside the map div. Everything else must be built:
  - the trace toggle button and its state (`aria-pressed`),
  - announcing "drawing mode on/off" and "area set, N results",
  - focus return after finishing or cancelling,
  - any keyboard or switch-access way to define an area.
- **Freehand + Enter:** finish only works when `canClose` is true. With `drawInteraction:'click-drag'` the shape normally closes on pointer-up anyway, so Enter matters little there.
- **Select mode Ctrl+R / Ctrl+S** clash with the browser's reload and save. If select mode is exposed, these should be remapped or disabled (`keyEvents`).
- Because Terra Draw renders through Google Maps overlay data layers and polygons, its shapes inherit the non-focusable, non-exposed behaviour in §3.
- Treat the docs' claim that freehand is unsupported on touch as a conflict to test on iOS and Android, since `click-drag` was added later.

### Gaps
- I did not test whether, in Terra Draw freehand mode with the Google adapter, Escape reaches Terra Draw before Google's own InfoWindow or shortcut handlers.
- I did not confirm whether Terra Draw calls `preventDefault` on its configured keys.

## 5. @googlemaps/markerclusterer: default cluster accessibility, custom renderer, known issues

### Takeaway
On a map with a Map ID, the default renderer returns an `AdvancedMarkerElement` with `title: "Cluster of ${count} markers"` and an SVG count. It does **not** set `gmpClickable`. Clusters still become interactive (focusable, `role="button"`, arrow-navigable) only because the library registers `addListener('gmp-click', …)` when `onClusterClick` is set, which it is by default (fit bounds).

That path is now deprecated: `addListener` was deprecated in Maps JS 3.66.4d, Sep 2026. The npm package has not been released since 2.6.2 (July 2025). A custom renderer should set its own accessible `title` and `gmpClickable:true`.

### Cited Findings
**Default renderer**
- `DefaultRenderer` builds `title = \`Cluster of ${count} markers\`` and an SVG with a `<text>` count.
- If Advanced Markers are available, it returns `new google.maps.marker.AdvancedMarkerElement({map, position, zIndex, title, content: svgEl})`, with no `gmpClickable`.
- Otherwise it returns a legacy `google.maps.Marker` with `title` and an icon.
- The `Renderer.render(cluster, stats, map)` interface is how you supply your own. Its doc example still shows legacy `google.maps.Marker`.

— [renderer.ts](https://github.com/googlemaps/js-markerclusterer/blob/3a887f2031b27f9c9a538274630e969090740025/src/renderer.ts)

**Click wiring**
- If `onClusterClick` is set, the library calls `cluster.marker.addListener(isAdvancedMarker ? "gmp-click" : "click", …)`.
- The default handler is `defaultOnClusterClickHandler`, which runs `map.fitBounds(cluster.bounds)`.

— [markerclusterer.ts L56–64, L255–285](https://github.com/googlemaps/js-markerclusterer/blob/3a887f2031b27f9c9a538274630e969090740025/src/markerclusterer.ts)

**What Maps JS does with that wiring**
- An MVC-registered `"gmp-click"` listener makes an AdvancedMarkerElement interactive (`role="button"`, focusable). But `addListener` now logs "Please use addEventListener with 'gmp-' events instead of addListener." (Minified source.) — [marker.js 3.66.12d](https://maps.googleapis.com/maps-api-v3/api/js/66/12d/marker.js)
- 3.66.4d (Sep 9 2026) "Deprecated AdvancedMarkerElement.addListener() and legacy events". — [Release notes](https://developers.google.com/maps/documentation/javascript/releases)

**Release status**
- npm `@googlemaps/markerclusterer` latest is **2.6.2**; the GitHub release is dated 2025-07-08. `main` is 213 commits ahead of `v2.6.2`, mostly dependency bumps plus unreleased fixes such as SuperCluster flicker and gts migration. — [GitHub releases](https://github.com/googlemaps/js-markerclusterer/releases); [compare v2.6.2...main](https://github.com/googlemaps/js-markerclusterer/compare/v2.6.2...main)

**Known issues and issue search**
- **#1152** (open): conflicting AdvancedMarkerElement click and accessibility warnings with markerclusterer 2.6.2. `addEventListener('gmp-click')` without `gmpClickable` makes clicks not fire. — [Issue #1152](https://github.com/googlemaps/js-markerclusterer/issues/1152)
- **#611** (closed 2025): warning about `click` versus `gmp-click`. — [Issue #611](https://github.com/googlemaps/js-markerclusterer/issues/611)
- **#601** (open since 2023): clicking a cluster zooms to the wrong place when map restrictions are enabled. — [Issue #601](https://github.com/googlemaps/js-markerclusterer/issues/601)
- No issues mention "aria", "screen reader" or "accessibility" beyond #1152. Issue searches for those terms returned nothing relevant. — [js-markerclusterer issues](https://github.com/googlemaps/js-markerclusterer/issues)

### Inferences
- **Default `title` text.** "Cluster of 349 markers" is English, developer-ish and fixed. For SUUMO-style UI, supply a renderer like this:
  ```js
  render: ({count, position}) => {
    const m = new google.maps.marker.AdvancedMarkerElement({
      position,
      title: `${count}件の物件。選択して拡大`,
      gmpClickable: true,
      content: bubbleEl /* no focusable children */
    });
    return m;
  }
  ```
  - `gmpClickable:true` keeps it focusable whether or not the library's deprecated `addListener` path keeps working.
  - Make the bubble's visible text `aria-hidden` or leave it out of the accessible name, so the count isn't read twice.
- **The real gap is the zoom announcement.** Pressing Enter on a cluster zooms via `fitBounds` and destroys and recreates every marker on `idle`. Focus will likely be lost to the map or body, and nothing announces the new zoom or the number of clusters. The team should:
  - catch `clusteringend`/`idle`,
  - announce "Zoomed in: 12 groups, 349 listings" in a live region,
  - move focus predictably, for example to the map region or the first new cluster.
- **Only drawn-area results.** For counts restricted to the drawn area, filter markers before passing them to the clusterer; the clusterer has no polygon awareness. The list view is the primary accessible path.

### Gaps
- I did not test focus retention after a cluster click and re-render in a real browser.
- No markerclusterer documentation or example addresses accessibility.

## 6. @vis.gl/react-google-maps: accessibility notes, AdvancedMarker props, examples

### Takeaway
The `AdvancedMarker` component passes `title` through as the accessible text. Its `clickable` prop maps to `gmpClickable`. `clickable` turns on automatically when `onClick`, `onKeyDown`, `onKeyUp`, `onMouseEnter` or `onMouseLeave` is set; the `onKeyDown`/`onKeyUp` props were added in v1.9.0 (June 2026) explicitly for accessibility.

The library adds no ARIA of its own and has no accessibility guide. Its examples generally omit `title`, so they produce unnamed `role="button"` markers.

### Cited Findings
**Props and how they map**
- Props: `clickable?`, `draggable?`, `title`, `onClick`, `onKeyDown(e: KeyboardEvent)`, `onKeyUp`, `onMouseEnter`, `onMouseLeave`, `onDrag*`.
- `title` is bound with `usePropBinding(marker, 'title', title ?? '')`.
- `gmpClickable = clickable ?? Boolean(onClick || onKeyDown || onKeyUp || onMouseEnter || onMouseLeave)`.
- For custom HTML content, a non-clickable marker gets `pointerEvents:'none'`.
- A source comment "gmpClickable is only available in beta version… (as of 2024-10-10)" is **outdated**: `gmpClickable` shipped in 3.55.8, Jan 2024.

— [advanced-marker.tsx L66–85, L274, L290–320](https://github.com/visgl/react-google-maps/blob/b9734e5f9ed12dc30281d1d7fae89272a69b6adb/src/components/advanced-marker.tsx); [Release notes archive](https://developers.google.com/maps/documentation/javascript/releases-archive)

**Component docs**
- `title`: "If provided, an accessibility text (e.g. for use with screen readers) will be added".
- `clickable`: "will be interactive for accessibility purposes (e.g., allowing keyboard navigation via arrow keys)".
- `onKeyDown`/`onKeyUp`: fire "while the marker is focused".

— [advanced-marker.md](https://github.com/visgl/react-google-maps/blob/b9734e5f9ed12dc30281d1d7fae89272a69b6adb/docs/api-reference/components/advanced-marker.md)

**Changelog and issues**
- v1.9.0 (2026-06-27): "add basic keyboard events for advanced marker (#1001)", resolving feature request #923 "Support keyboard events for `AdvancedMarker` for better accessibility". v1.8.0 (2026-03-26): "better handling for `clickable` prop". — [CHANGELOG](https://github.com/visgl/react-google-maps/blob/b9734e5f9ed12dc30281d1d7fae89272a69b6adb/CHANGELOG.md); [Issue #923](https://github.com/visgl/react-google-maps/issues/923)
- Open bug #704: focusable child elements, such as an `<input>`, inside `<AdvancedMarker>` trigger Google's "not supported" message. — [Issue #704](https://github.com/visgl/react-google-maps/issues/704)
- Open feature request #435 asks for Polygon/Polyline components; there are no built-in shape components. — [Issue #435](https://github.com/visgl/react-google-maps/issues/435)
- Fixed in 2024: `InfoWindow` took focus even with `shouldFocus:false` (#274). — [Issue #274](https://github.com/visgl/react-google-maps/issues/274)

**Map component and examples**
- The `Map` component source has no `aria`, `title` or `role` handling, so there are no map-level accessibility props. — [map/index.tsx](https://github.com/visgl/react-google-maps/blob/b9734e5f9ed12dc30281d1d7fae89272a69b6adb/src/components/map/index.tsx)
- Examples exist for `marker-clustering`, `custom-marker-clustering` (both using `@googlemaps/markerclusterer`) and `terra-draw` (which uses `TerraDrawFreehandMode`). The marker-clustering example's `<AdvancedMarker position ref onClick>` has no `title`. — [examples/marker-clustering/src/tree-marker.tsx](https://github.com/visgl/react-google-maps/blob/b9734e5f9ed12dc30281d1d7fae89272a69b6adb/examples/marker-clustering/src/tree-marker.tsx); [examples/terra-draw](https://github.com/visgl/react-google-maps/tree/b9734e5f9ed12dc30281d1d7fae89272a69b6adb/examples/terra-draw)

### Inferences
- In React, always pass `title` (localized) on every `<AdvancedMarker onClick>`. Never render `<button>` or `<a>` as marker children; put the interaction on the marker itself.
- Use `onKeyDown` only for extra keys. Enter and Space activation already comes through `onClick` via `gmp-click`. Adding `onKeyDown` also forces `clickable`.
- If you copy the vis.gl examples as-is, you get unnamed buttons.

### Gaps
- No accessibility documentation page or accessibility-focused example exists in the vis.gl docs; nothing was found to cite.

## 7. Data-driven styling (boundaries / feature layers): keyboard-selectable or click-only?

### Takeaway
Feature-layer boundary polygons (prefectures, municipalities, postal codes and so on) respond only to pointer events, `click` and `mousemove`. Google documents no keyboard, focus or screen-reader support for them, so boundary selection has to be duplicated in an accessible list or combobox.

### Cited Findings
- The DDS "handle events" guide shows how to "Make a feature layer respond to `mousemove` and `click` events". It has no mention of keyboard, focus, accessibility or screen readers (page last updated 2026-10-28). — [Data-driven styling for boundaries: handle events](https://developers.google.com/maps/documentation/javascript/dds-boundaries/handle-events)
- No accessibility release note between 2023 and 2026 mentions feature layers or data-driven styling. — [Release notes](https://developers.google.com/maps/documentation/javascript/releases); [Release notes archive](https://developers.google.com/maps/documentation/javascript/releases-archive)

### Inferences
- If the product offers "tap a ward/municipality to search", it needs an equivalent accessible picker, for example 「エリアから探す」 lists. Japanese property apps already offer these, so this doubles as the WCAG 2.5.7 / 2.1.1 alternative to tracing.

### Gaps
- I did not read the feature-layer module source to confirm the absence of keyboard handling. The conclusion rests on the documentation alone.

## 8. Google samples, codelabs, blog posts, and VPAT/ACR availability

### Takeaway
Google's accessibility material for Maps JS is:
- one marker accessibility guide with samples (Advanced and legacy),
- three blog posts (2021, 2022, 2023),
- release notes,
- custom-control guidance.

I found no codelab on map accessibility, no guidance on accessible drawing or shapes, and no Accessibility Conformance Report/VPAT for Google Maps or Maps Platform.

### Cited Findings
- **Guides and samples.** "Make markers clickable and accessible" (Advanced Markers) and its sample, plus the legacy "Marker Accessibility" sample. — [Accessible markers guide](https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers); [Marker Accessibility sample](https://developers.google.com/maps/documentation/javascript/examples/marker-accessibility)
- **Blog posts:** [2021](https://mapsplatform.google.com/resources/blog/improved-accessibility-maps-javascript-api/), [2022](https://mapsplatform.google.com/resources/blog/latest-accessibility-updates-maps-javascript-api/) and [2023](https://mapsplatform.google.com/resources/blog/2023-accessibility-updates-maps-javascript-api/). Each asks developers to file or +1 bugs to prioritise accessibility work.
- **ACR list.** Google's list includes Workspace apps (Docs, Gmail, Meet and others), Chrome, ChromeOS, Google Cloud, Pixel, Messages, Voice and more. There is **no** report for Google Maps, Maps Platform, the Maps JavaScript API or the Embed API. — [Google Accessibility Conformance Reports](https://accessibility.google/accessibility-conformance-reports)
- **Google Cloud VPATs.** Google Cloud products have VPAT 2.5-based reports, such as Earth Engine (2024) and Error Reporting (2025), listing WCAG 2.0/2.1/2.2 A/AA, Section 508 and EN 301 549 and contact gcp-accessibility@google.com. None covers Maps Platform. — [Earth Engine VPAT (PDF)](https://services.google.com/fh/files/misc/earth-engine-vpat-2024-08-29.pdf); [Error Reporting VPAT (PDF)](https://services.google.com/fh/files/misc/error-reporting-vpat-2025-01-20.pdf)

### Inferences
- **Procurement.** A buyer who requires an ACR will not get one from Google for Maps JS. The team would have to produce its own ACR covering its whole map search UI, including the third-party map.

**What you get for free vs. what you must build**

| Free from the libraries | Must build |
|---|---|
| Focusable map region named "Map" | Localized, meaningful region name |
| Arrow, +/-, Home/End/PgUp/PgDn keys; shortcuts dialog | Accessible trace toggle (`aria-pressed`) with on/off announcements |
| Tab/arrow navigation of clickable markers | Non-drawing alternatives for defining an area: area/station lists, "search this visible area", radius |
| `title` as the marker accessible name | Text summary of the drawn area |
| Keyboard drag for draggable Advanced Markers | Live-region announcements of result and cluster counts |
| InfoWindow focus management and Esc | Localized cluster `title`s and `gmpClickable` |
| Terra Draw Esc cancel / Enter finish | Focus management after a cluster zoom or after drawing finishes or is cancelled |
| | A synchronized, fully accessible list view as the primary non-visual path |
| | Visible focus styles on the custom overlay |
| | A replacement for the default touch instruction text, which disappears when `gestureHandling:'none'` |

Not provided by any of these libraries:
- accessible names or descriptions for polygons, circles or polylines,
- keyboard vertex placement or editing,
- accessible boundary (feature-layer) selection,
- live announcements of result counts,
- focus management for a custom pointer-events overlay.

### Gaps
- No Google codelab or blog post on accessible drawing or area selection was found. Absence was checked through targeted searches only; a codelab could exist under an unexpected title.
- No independent third-party audit of Maps JS (for example from WebAIM or Deque) dated 2024–2026 was found.
