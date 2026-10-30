# WCAG 2.2 requirements and legal/standards landscape for a web "draw an area on the map to search" (なぞる検索) feature

Scope: web only (Google Maps JS API in desktop and mobile browsers). Japan is the primary market. Status is as of 2026-10-29.

Sourcing convention: **[fetched]** means the quote came from the page in this session. **[recalled]** means the technique or failure ID, or the quote, comes from prior knowledge of the W3C or legal text and was *not* re-fetched in this session. The report writer should verify [recalled] items before quoting them verbatim.

---

## Q1a. Keyboard and the path-dependent exception (2.1.1, 2.1.2): is freehand drawing exempt, and how does that interact with search-by-area?

### Takeaway
The 2.1.1 exception attaches to the *underlying function*, not to the input technique. The underlying function here is "restrict the search to a geographic area", which does not depend on a path, so it must be keyboard-operable. Freehand tracing can stay pointer-only as long as a keyboard-operable route to the same function exists (vertex polygon, radius, viewport "search this area", station/ward lists). Any drawing mode must also be exitable by keyboard alone (2.1.2).

### Cited Findings
- SC 2.1.1 (A), normative [fetched]: "All functionality of the content is operable through a keyboard interface without requiring specific timings for individual keystrokes, except where the underlying function requires input that depends on the path of the user's movement and not just the endpoints." — [Understanding 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- SC 2.1.1 Note 1 [fetched]: "This exception relates to the underlying function, not the input technique." Its example: "if using handwriting to enter text, the input technique (handwriting) requires path-dependent input but the underlying function (text input) does not." — [Understanding 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- Intent [fetched]: "Free hand drawing, or watercolor painting require path dependent input." By contrast, "Drawing straight lines, regular geometric shapes, re-sizing windows and dragging objects to a location (when the path to that location is not relevant) do not require path dependent input." The page does not mention maps or route drawing. — [Understanding 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- 2.1.1 sufficient techniques [fetched]: G202 (Ensuring keyboard control for all functionality), H91 (Using HTML form controls and links), G90 (keyboard-triggered event handlers), SCR20 (Using both keyboard and other device-specific functions), SCR35 (onclick of anchors/buttons), SCR2 (redundant keyboard and mouse event handlers). Failures [fetched]: F54 (relying only on pointing-device-specific event handlers, including gesture-based ones), F55 (script removes focus when an element receives it), F42 (emulating links). — [Understanding 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)
- SC 2.1.2 No Keyboard Trap (A), normative [fetched]: "If keyboard focus can be moved to a component of the page using a keyboard interface, then focus can be moved away from that component using only a keyboard interface, and, if it requires more than unmodified arrow or tab keys or other standard exit methods, the user is advised of the method for moving focus away." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/). (The fetch returned the first clause verbatim; the "advised of the method" clause is [recalled] standard wording.)
- 2.1.2 technique G21 (Ensuring that users are not trapped in content) and failure F10 (combining multiple content formats in a way that traps users) [recalled]. — [Understanding 2.1.2](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html)
- Understanding 2.5.7 [fetched]: 2.1.1/2.1.3 "require dragging features to be keyboard accessible", but "achieving keyboard equivalence for a dragging operation does not automatically meet this success criterion, unless that equivalent keyboard operation also provides controls that can be clicked or tapped with a pointer." — [Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

### Inferences
- The handwriting analogy maps directly. Tracing is the input technique and "search within area X" is the underlying function. Since an area can be fully specified by endpoints (vertices, centre plus radius, viewport bounds, named administrative areas), the function is not path-dependent and is **not exempt** from 2.1.1. The freehand gesture itself can stay pointer-only if an equivalent keyboard-operable method exists on the page.
- The keyboard alternative and the 2.5.7 single-pointer alternative should be the *same visible controls*: buttons, a list or select of wards/stations/lines, "search this area", or a radius selector. A keyboard-only path (for example, arrow keys to place vertices inside the map with no visible buttons) satisfies 2.1.1 but not 2.5.7.
- 2.1.2 risks specific to this feature:
  - (a) Google Maps' keyboard handling. The map container takes focus and arrow keys pan the map, but Tab must still leave it.
  - (b) A modal "drawing mode" overlay that captures keys. It needs Esc to exit, and a visible Cancel/Done button.
  - (c) Focus trapped inside a custom info window or bottom sheet.
  If any non-standard exit is used, users must be told how to exit.
- Pressing Esc mid-stroke should abort the stroke. This also supports 2.5.2 (see Q1c).

### Gaps
- I found no W3C text that explicitly discusses "search by drawn area" or map lasso selection under 2.1.1. The conclusion rests on Note 1's input-technique vs. underlying-function rule, which is normative.

---

## Q1b. Pointer criteria: 2.5.1 Pointer Gestures, 2.5.2 Pointer Cancellation, 2.5.7 Dragging Movements, 2.5.8 Target Size (Minimum)

### Takeaway
Freehand tracing is both path-based (2.5.1) and a dragging movement (2.5.7). Each needs a single-pointer, non-path, non-drag alternative such as tap-to-place vertices, list selection, or "search this area", because restricting a search to an area is not "essential".
- **2.5.2:** a stroke that completes on pointerup is compliant **if** the user can abort before completion or undo afterwards. Concretely: an Undo / Clear / Redraw control, Esc, and ideally discarding strokes released off-map or too small.
- **2.5.8:** the trace, clear, zoom and list controls need at least 24×24 CSS px or adequate spacing. Dense map pins and clusters can use the "Essential" exception for position, but W3C "strongly encourages" an equivalent alternative such as the list view.

### Cited Findings
- SC 2.5.1 (A), normative [fetched]: "All functionality that uses multipoint or path-based gestures for operation can be operated with a single pointer without a path-based gesture, unless a multipoint or path-based gesture is essential." (The fetch returned the first clause; the full sentence is [recalled] standard wording.) — [WCAG 2.2](https://www.w3.org/TR/WCAG22/); [Understanding 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)
- 2.5.1 sufficient techniques G215 (Providing controls to achieve the same result as path based or multipoint gestures) and G216 (Providing single point activation for a control slider); failure F105 (functionality via a path-based gesture without a simple pointer alternative) [recalled]. The Understanding doc's map example uses pinch-zoom with +/− buttons as the alternative [recalled]. — [Understanding 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)
- SC 2.5.2 (A), normative [fetched]. For functionality operable with a single pointer, at least one of these is true:
  - "No Down-Event: The down-event of the pointer is not used to execute any part of the function;"
  - "Abort or Undo: Completion of the function is on the up-event, and a mechanism is available to abort the function before completion or to undo the function after completion;"
  - "Up Reversal: The up-event reverses any outcome of the preceding down-event;"
  - "Essential: Completing the function on the down-event is essential."
  — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- 2.5.2 techniques G210 (Ensuring that drag-and-drop actions can be cancelled) and G212 (Using native controls to ensure functionality is triggered on the up-event); failure F101 (activating a control on the down-event) [recalled]. — [Understanding 2.5.2](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)
- Glossary [fetched, from inline tooltips]: "single pointer" is "an input modality that only targets a single point on the page/screen at a time". "down-event" is the "platform event that occurs when the trigger stimulus of a pointer is depressed", and "up-event" the one that occurs "when the trigger stimulus of a pointer is released". "essential": "if removed, would fundamentally change the information or functionality of the content". — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 2.5.7 (AA), normative [fetched]: "All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging, unless dragging is essential or the functionality is determined by the user agent and not modified by the author." Note: "This requirement applies to web content that interprets pointer actions (i.e., this does not apply to actions that are required to operate the user agent or assistive technology)." — [Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Understanding 2.5.7 map example [fetched]: "A map allows users to drag the view of the map around … the map has up/down/left/right buttons to move the view as well." Drawing example [fetched]: the user can "draw a selection rectangle on an image by first setting one corner of the rectangle" and then the opposite corner, which is a click-click alternative. — [Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Understanding 2.5.7 [fetched]: "the single pointer alternative can't exclusively rely on a path-based gesture, such as swiping or 'flicking', as this would fail the requirements of 2.5.1 Pointer Gestures." An action involving both dragging and a path-based gesture "may fail against the requirements of both success criteria." — [Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- 2.5.7 sufficient technique [fetched]: G219 (Ensuring that an alternative is available for dragging movements that operate on content). Failure [fetched]: F108 (not providing a single pointer method that does not require a dragging movement). — [Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- SC 2.5.8 (AA), normative [fetched]: "The size of the target for pointer inputs is at least 24 by 24 CSS pixels, except when:"
  - Spacing: "Undersized targets … are positioned so that if a 24 CSS pixel diameter circle is centered on the bounding box of each, the circles do not intersect another target or the circle for another undersized target;"
  - Equivalent: "The function can be achieved through a different control on the same page that meets this criterion;"
  - Inline: "The target is in a sentence or its size is otherwise constrained by the line-height of non-target text;"
  - User Agent Control: "The size of the target is determined by the user agent and is not modified by the author;"
  - Essential: "A particular presentation of the target is essential or is legally required for the information being conveyed."
  — [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Understanding 2.5.8 on maps [fetched]: "in digital maps, the position of pins is analogous to the position of places shown on the map. If there are many pins close together, the spacing between pins and neighboring pins will often be below 24 CSS pixels. It is essential to show the pins at the correct map location, therefore the Essential exception applies." Also: "When the 'Essential' exception is applicable, authors are strongly encouraged to provide equivalent functionality through alternative means". Sufficient technique [fetched]: C42 (min-height and min-width on the target container). — [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

### Inferences
- **2.5.1 / 2.5.7 alternatives that qualify** (single pointer, no path, no drag):
  - tap-to-place polygon vertices, then "Done";
  - a radius selector after tapping a centre point or using the current location;
  - "search this area" (viewport bounds), together with the map's pan/zoom buttons, so panning itself has a non-drag path;
  - ward/station/line pickers.
  
  Radius by dragging a handle does not qualify unless a tap or select alternative exists. Walking-time isochrones from a tapped point qualify.
- Map panning by drag is *author-interpreted* in a Google Maps JS app. It is not a user-agent function, so 2.5.7 covers it too. Pan buttons, keyboard arrows plus visible pan controls, or search-by-name satisfy it. Google's built-in controls cover zoom (+/−) but not panning by default. Teams typically add pan buttons or rely on "search by place name" plus zoom.
- **2.5.2 analysis for the stroke.** pointerdown starts the stroke and pointerup closes the polygon and runs the search. That is "completion on the up-event", so the team must provide abort *or* undo:
  - Abort-before-completion options: Esc during the stroke; cancelling if the pointer leaves the map or the stroke is shorter than a threshold; pointercancel handling.
  - Undo-after options: a visible "クリア/やり直す" (clear/redo) button that restores the previous result set.
  
  If the trace button toggles the mode on pointerdown, that would fail. Use native `<button>` click (G212).
- **2.5.8 per component:**
  - Trace toggle, Clear, Done/Search, zoom/pan, list/map switch, filter chips: at least 24×24 CSS px. Mobile platform guidance suggests 44–48 px, which is outside WCAG.
  - Vertex handles in tap-to-place mode: author-sized, so the handle hit area needs 24 px or spacing. Its *position* is essential, but its *size* is not.
  - Cluster badges: usually already at least 24 px. Individual property pins may claim Essential, with the list view as the strongly encouraged alternative.
  - Google's own map controls fall under "User Agent Control" only if the browser sizes them, which it does not. They are third-party author content, so check their size.
- The list view helps several criteria at once. For pins it is the "Equivalent" or "strongly encouraged alternative" (2.5.8), and it is the main text alternative (1.1.1, Q1d).

### Gaps
- The 2.5.1 and 2.5.2 technique and failure IDs (G215, G216, F105, G210, G212, F101) and the 2.5.1 map pinch example are [recalled] and should be verified at the Understanding URLs above.
- No W3C document addresses whether "search as you pan" counts as a dragging-movement *function* separate from panning. Treat it as covered once panning has a non-drag alternative.

---

## Q1c. Focus criteria: 2.4.3 Focus Order, 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured (Minimum)

### Takeaway
Focus must move in a meaningful order (trace button, then drawing controls, then results), be visibly indicated on custom map controls and markers, and not be entirely hidden by sticky bottom sheets, floating toolbars or info windows. That last risk is high on mobile layouts that overlay the map.

### Cited Findings
- SC 2.4.3 (A), normative [fetched]: "If a web page can be navigated sequentially and the navigation sequences affect meaning or operation, focusable components receive focus in an order that preserves meaning and operability." (The fetch returned the final clause; the condition clause is [recalled].) — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 2.4.7 (AA), normative [fetched]: "Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 2.4.11 (AA), normative [fetched excerpt]: "When a user interface component receives keyboard focus, the component is not entirely hidden due to author-created content." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/); [Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- Failure F78 (styling outlines or borders so the focus indicator is removed or invisible) applies to 1.4.11, 2.4.7 and 2.4.13 [fetched]. Technique C40 (two-colour focus indicator to ensure contrast with all components) [fetched]. — [Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- 2.4.3 techniques G59 (placing interactive elements in an order that follows sequences and relationships) and SCR26/SCR27; failures F44 (tabindex order that doesn't preserve meaning) and F85 (dialogs or menus not adjacent to their trigger in focus order) [recalled]. 2.4.11 technique C43 (CSS scroll-padding to un-obscure content); failure F110 (sticky footer or header completely hiding focused elements) [recalled]. — [Understanding 2.4.3](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html); [Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)

### Inferences
- **Focus order.** After activating "なぞる" (or its alternative), focus should go to the drawing-mode controls (instructions, Done, Cancel). After the search completes, focus should stay put or move predictably. Moving it is a change of context (see 3.2.2 in Q1e). Markers and clusters injected into the map DOM should not interleave unpredictably with the list. A common pattern is to make individual markers non-tabbable and use the list as the keyboard path, but then the list must offer everything markers offer.
- **Focus visible.** Custom HTML markers (AdvancedMarkerElement content), cluster badges, polygon vertex handles and the map container itself need a visible indicator with 3:1 contrast against varied tile colours. C40-style two-colour rings are the robust choice.
- **2.4.11.** Typical mobile real-estate layouts have a draggable results bottom sheet, a floating search bar and a floating trace button. These can fully cover a focused marker, cluster, or a list row scrolled under a sticky header. Info windows can also cover adjacent markers. Mitigate with scroll-padding, auto-panning the map so the focused marker sits in the unobscured area, and collapsing the sheet on focus.

### Gaps
- No W3C guidance specifically on focus management inside interactive map canvases. Google's own keyboard model for markers is covered by the other researcher.

---

## Q1d. Perceivable criteria: 1.1.1 Non-text Content, 1.3.1 Info and Relationships, 1.4.1 Use of Color, 1.4.3 Contrast, 1.4.11 Non-text Contrast, 1.4.10 Reflow, 1.4.13 Content on Hover or Focus

### Takeaway
- **1.1.1:** the interactive map is a control/input, so it needs an accessible name that describes its purpose. The imagery's "equivalent purpose" for search is *which properties match and where*, which is best met by a text result list plus a text description of the active area (e.g., "描いたエリア内: 349件, 新宿区西新宿〜代々木付近").
- **Contrast:** count text on badges needs 4.5:1 (1.4.3). Badge shapes, the polygon outline, vertex handles and focus rings need 3:1 against adjacent colours (1.4.11), which is hard over varied tiles, so use two-tone strokes. Inside/outside the area cannot be shown by colour alone (1.4.1).
- **Reflow:** the map itself is exempt from 1.4.10, but the trace toolbar, list, error messages and filters must reflow at 320 CSS px.
- **1.4.13:** hover or focus popups on clusters and pins must be dismissible, hoverable and persistent.

### Cited Findings
- SC 1.1.1 (A), normative [fetched]: "All non-text content that is presented to the user has a text alternative that serves the equivalent purpose, except for the situations listed below." "Controls, Input: If non-text content is a control or accepts user input, then it has a name that describes its purpose." "Sensory: … text alternatives at least provide descriptive identification of the non-text content." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/); [Understanding 1.1.1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)
- SC 1.3.1 (A) [fetched]: "Information, structure, and relationships conveyed through presentation can be programmatically determined or are available in text." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 1.4.1 (A) [fetched]: "Color is not used as the only visual means of conveying information, indicating an action, prompting a response, or distinguishing a visual element." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 1.4.3 (AA) [fetched]: text and images of text need "a contrast ratio of at least 4.5:1". Large text needs 3:1, and incidental text that is "part of a picture that contains significant other visual content" has no requirement [recalled exception wording]. — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 1.4.11 (AA), normative [fetched]: "The visual presentation of the following have a contrast ratio of at least 3:1 against adjacent color(s): User Interface Components: Visual information required to identify user interface components and states, except for inactive components or where the appearance of the component is determined by the user agent and not modified by the author; Graphical Objects: Parts of graphics required to understand the content, except when a particular presentation of graphics is essential to the information being conveyed." — [Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Understanding 1.4.11 [fetched]: for gradients, "identify the graphical object(s) required for understanding, and take the central color of that area". "If there are multiple colors and/or a gradient, choose the least contrasting area to test". A graphic needs no contrast if "The information is available in another form". The page does **not** mention maps. Techniques [fetched]: G174, G195, C40, G207 (3:1 for icons), G209 (contrast at boundaries between adjoining colours). Failure [fetched]: F78. — [Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Understanding 1.4.11 on essential [fetched]: "There is no requirement to change pictures of real life scenes such as photos of people or scenery." The exemption also states "the user interface components are not exempted from other aspects of this success criterion". — [Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- SC 1.4.10 (AA), normative [fetched]: content can be presented without loss of information or functionality, and without two-dimensional scrolling, at 320 CSS px wide (vertical scrolling) or 256 CSS px high, "Except for parts of the content which require two-dimensional layout for usage or meaning." Note 2: "Examples of content which requires two-dimensional layout are images required for understanding (such as maps and diagrams), video, games, presentations, data tables (not individual cells), and interfaces where it is necessary to keep toolbars in view while manipulating content." — [Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- Understanding 1.4.10 [fetched]: "When a section of content is excepted from Reflow, the exception does not automatically extend to other content that doesn't need two-dimensional scrolling". "Interfaces which provide toolbars to edit content need to show both the content and the toolbar in the viewport". For tables and grids, "a preceding heading, a search field, or an accompanying pagination … are not excepted from meeting Reflow." Failure [fetched]: F102 (content disappearing on reflow). Techniques include C31, C32, C38, SCR34, G206. — [Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- SC 1.4.13 (AA) [fetched]: additional content shown on hover or focus must be "Dismissible: A mechanism is available to dismiss the additional content without moving pointer hover or keyboard focus", "Hoverable: … the pointer can be moved over the additional content without the additional content disappearing", and "Persistent: The additional content remains visible until the hover or focus trigger is removed, the user dismisses it, or its information is no longer valid." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

### Inferences
- **1.1.1 for the map.**
  - The map container is a control, so it needs a name such as `aria-label="物件検索マップ"` (property search map). Google Maps renders `role="region"` plus `aria-roledescription="map"`, and the label should be set by the author.
  - The map imagery is not "pure decoration". Its equivalent purpose in this feature is spatial result discovery, so the text alternative is the result list plus a text summary of the active search area (drawn area or ward names, count) and of what each cluster represents.
  - Describing the base map in prose is neither expected nor useful. Tiles count as "Sensory"/incidental picture content for 1.4.3.
  - Each cluster badge, as a control, needs a name, e.g., "210件のクラスター、選択して拡大" ("cluster of 210 listings, select to zoom in").
- **1.3.1:**
  - The result list should use real list/heading/table semantics.
  - The relationship "results are filtered to the drawn area" must be in text near the list, not only implied by the polygon.
  - Cluster badges should expose count and meaning, not just digits.
  - The trace-mode state belongs to 4.1.2 (aria-pressed).
- **1.4.1:** do not convey inside vs. outside only by fill hue or colour shift. Use an outline plus a dimming mask outside, a text summary, and "within area" labels. Selected or active cluster states also need non-colour cues (border width, icon).
- **1.4.3:** badge counts like "210" and "349" are author text, so 4.5:1 against the badge fill (or 3:1 if large: ≥24 px regular / ≥18.66 px bold). Google-rendered street labels in tiles are third-party picture content.
- **1.4.11:**
  - The drawn polygon outline is a graphical object required to understand the search area. It needs 3:1 against adjacent tile colours, which vary from white roads to green parks to blue water to dark mode. A single colour rarely achieves 3:1 everywhere. A dark stroke with a light halo (C40/G209 logic) is the robust pattern.
  - A translucent fill is not required for contrast if the outline carries the information.
  - Editable vertex handles and the trace toggle are UI components, so their boundary/state needs 3:1.
  - Cluster badge shapes: if the badge is identified only by its fill against tiles, the fill edge needs 3:1. A dark border ring helps.
  - The "information is available in another form" clause can cover parts of the graphic if the text summary and list carry the info, but not UI components.
- **1.4.10:** the map viewport may need 2-D panning (exception). At 320 px width with 400% zoom, the trace toolbar, Done/Clear, the error/empty-state message and the list must reflow without horizontal scroll. Full-screen drawing modes that hide the toolbar or list off-canvas fail (F102 pattern).
- **1.4.13:** if hovering a cluster shows a preview popup or tooltip (e.g., price range), Esc must dismiss it without moving the pointer, it must stay while the pointer moves onto it, and it must not time out. Google `InfoWindow` opened on hover needs this handling. Click-opened info windows are not covered by 1.4.13 but must meet 2.1.2 and 2.4.3.

### Gaps
- No W3C document found that addresses polygon overlay contrast on map tiles or explicitly applies 1.1.1 to interactive maps. The above is inference from the general SC text.
- The 1.4.3 incidental exception wording and the large-text thresholds are [recalled].

---

## Q1e. Understandable and robust criteria: 3.2.2 On Input, 3.3.1 Error Identification, 3.3.3 Error Suggestion, 4.1.2 Name, Role, Value, 4.1.3 Status Messages

### Takeaway
- **3.2.2:** auto-searching on finger lift or on map pan is acceptable when it updates content in place (a change of content). If it navigates, opens a new view, or moves focus (a change of context), users must be advised first, or a "search this area" or Done button used instead.
- **3.3.1/3.3.3:** invalid shapes (too small, self-intersecting, outside the service area, too many vertices) and zero results must be identified *in text*, with suggestions.
- **4.1.2:** the trace control needs a toggle-button role and state.
- **4.1.3:** count updates ("349件") must be announced via role="status" or a live region without moving focus.

### Cited Findings
- SC 3.2.2 (A) [fetched]: "Changing the setting of any user interface component does not automatically cause a change of context unless the user has been advised of the behavior before using the component." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- Glossary "changes of context" [fetched]: "major changes that, if made without user awareness, can disorient users who are not able to view the entire page simultaneously". The definition lists changes of user agent, viewport, focus, and content that changes the meaning of the page [recalled list]. — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 3.3.1 (A) [fetched]: "If an input error is automatically detected, the item that is in error is identified and the error is described to the user in text." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 3.3.3 (AA) [fetched]: "If an input error is automatically detected and suggestions for correction are known, then the suggestions are provided to the user, unless it would jeopardize the security or purpose of the content." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 4.1.2 (A) [fetched]: "For all user interface components (including but not limited to: form elements, links and components generated by scripts), the name and role can be programmatically determined; states, properties, and values that can be set by the user can be programmatically set; and notification of changes to these items is available to user agents, including assistive technologies." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- SC 4.1.3 (AA) [fetched]: "In content implemented using markup languages, status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus." Glossary "status message" [fetched]: "change in content that is not a change of context, and that provides information to the user on the success or results of an action, on the waiting state of an application, on the progress of a process, or on the existence of errors." — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- Techniques [recalled]:
  - 3.2.2: G80 (submit button to initiate a change of context), G13 (describing what will happen before a change), with failures F36 (auto-submitting a form on changing the last field) and F37 (launching a new window on a radio/checkbox/select change).
  - 3.3.1: G83, G85, G84, G139, ARIA19, ARIA21, SCR18.
  - 4.1.3: ARIA22 (role=status), ARIA19 (role=alert), ARIA23 (role=log), with failure F103 (status messages not programmatically determinable).
  - 4.1.2: ARIA14/ARIA16 (naming), with failures F59 and F79.
  — [Understanding 3.2.2](https://www.w3.org/WAI/WCAG22/Understanding/on-input.html); [Understanding 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html); [Understanding 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html); [Understanding 4.1.2](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)
- WCAG 2.2 is the W3C Recommendation dated 12 December 2024 (REC-WCAG22-20241212). 4.1.1 Parsing is obsolete and removed in 2.2 [fetched]. — [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

### Inferences
- **3.2.2:**
  - Re-filtering the results list and updating badges in place after pointerup is a status/content update, not a change of context, so it passes. 4.1.3 then requires announcing it.
  - "Search as I move the map" is the same, provided focus and viewport stay put. Repeated, chatty announcements should be throttled or debounced.
  - It fails or needs prior advice if lifting the finger auto-navigates to a results page, switches map↔list, or moves focus to the list. Fix with an explicit "この範囲で検索" (search this area) / Done button, or advise users in the trace-mode instructions.
- **3.3.1/3.3.3 triggers specific to drawn areas:**
  - shape area below a minimum, or a stroke too short to close;
  - self-intersection;
  - area too large (server limits);
  - outside the coverage region;
  - zero results.
  
  Each needs a text message that is visible and announced (role=alert or status), plus a suggestion (e.g., "範囲が狭すぎます。もう少し大きく囲むか、駅・エリアから探してください" — "The area is too small. Circle a slightly larger area, or search by station or area"). Silently discarding a stroke fails 3.3.1. Zero results is arguably a status message (4.1.3), not an input error, but should still suggest widening the area.
- **4.1.2:**
  - "なぞる" toggle: a native `<button aria-pressed="true|false">` with the accessible name "地図をなぞって範囲指定" ("trace on the map to set the area").
  - Clear/Done: named buttons.
  - Map: named region.
  - Cluster markers: role=button with name including the count.
  - Polygon vertex handles (tap-to-place): named, focusable controls whose position values can be changed by keyboard if editing is offered.
  - The list/map switch: tab or toggle state.
- **4.1.3:** use one polite `role="status"` region, e.g., "描いた範囲内に349件の物件があります" ("349 properties in the drawn area"), plus "検索中…" ("searching…") for the waiting state. Errors go through role=alert.

### Gaps
- Whether "content that changes the meaning of the Web page" makes a wholesale result-set replacement a *change of context* is debated. W3C examples treat in-page filtering as acceptable. I did not fetch Understanding 3.2.2 to quote this.

---

## Q2. Does W3C/WAI have specific guidance on accessible maps?

### Takeaway
There is no normative W3C accessible-maps guideline. The relevant W3C material is:
- map examples embedded in WCAG 2.2 Understanding docs: 1.4.10 (maps are 2-D exempt), 2.5.7 (map drag with arrow buttons), 2.5.8 (pins Essential exception), and 2.5.1 (pinch-zoom with +/− buttons, recalled);
- the 2020 W3C/OGC "Maps for the Web" workshop report;
- the Maps for HTML Community Group's MapML proposal, which is not a Recommendation;
- an old, non-consensus WAI research wiki page.

### Cited Findings
- Understanding 1.4.10 explicitly names "maps and diagrams" as content needing two-dimensional layout [fetched]. — [Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- Understanding 2.5.7 example: map drag plus "up/down/left/right buttons to move the view" [fetched]. — [Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
- Understanding 2.5.8: map pins are under the Essential exception, and authors are "strongly encouraged to provide equivalent functionality through alternative means" [fetched]. — [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Understanding 1.4.11 does not mention maps [fetched]. — [Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- The W3C WAI wiki "Accessible Maps" page is edited by Research and Development Working Group participants, "does not necessarily represent consensus" and "may have incorrect information". — [WAI RD wiki: Accessible Maps](https://www.w3.org/WAI/RD/wiki/Accessible_Maps.html) (via search summary)
- The joint W3C/OGC "Maps for the Web" workshop (21 Sep – 2 Oct 2020) report, published 2021, says geospatial information on the Web is fragmented and inadequately covered by Web standards. Participants highlighted requirements that "start with support for real-world-feature-based accessibility for people with disabilities". The recommended next step was a W3C working group. — [Workshop report](https://www.w3.org/2020/maps/report); [W3C blog](https://www.w3.org/blog/2021/w3c-ogc-publishes-maps-for-the-web-workshop-report)
- A secondary source (UVA library guide) says the report found none of the existing map frameworks met WCAG 2.1. This is **unverified against the report**. — [UVA guide](https://guides.lib.virginia.edu/c.php?g=1248895)
- MapML (Map Markup Language) is a proposed HTML extension from the W3C Maps for HTML Community Group, specified at maps4html.org, and not a W3C Recommendation. — [Maps4HTML MapML proposal wiki](https://github.com/Maps4HTML/MapML-Proposal/wiki); [geo.ca MapML](https://geo.ca/initiatives/mapml/)
- WAI's Research Questions Task Force (RQTF) was named in 2021 as the active WAI group on the topic. — [w3c-wai-ig list, 2021](https://lists.w3.org/Archives/Public/wai-eo-editors/2021Mar/0003.html)
- Non-W3C government example: the Maryland Department of Disability's "Digital Mapping Accessibility Standards" (2022). — [MDOD document](https://mdod.maryland.gov/news/Documents/Maryland%20Digital%20Mapping%20Accessibility%20Standards%20-%202022%20final%20(2).docx)

### Inferences
- In audits, the map-specific W3C hooks are the Understanding-doc examples. For everything else, auditors apply general SCs, and the "provide an equivalent non-map path" pattern (list or text search) is the de facto expectation.

### Gaps
- I did not read the workshop report's accessibility section directly, nor any current RQTF "accessible maps" research note. As of 2026 I found no WAI Note dedicated to maps.

---

## Q3. Japan: JIS X 8341-3, the amended 障害者差別解消法 (合理的配慮 / 環境の整備), Digital Agency and 総務省 guidance, enforcement

### Takeaway
- **JIS.** JIS X 8341-3:2016 (= ISO/IEC 40500:2012 = WCAG 2.0) is still the in-force JIS as of the latest sources (Oct 2026). A revision aligned to ISO/IEC 40500:2025 (= WCAG 2.2) began in Oct 2025. It is expected between late 2026 and March 2027, and publication was not confirmed as of 2026-10-29.
- **Law.** Under the amended 障害者差別解消法, *individual* reasonable accommodation (合理的配慮) has been mandatory for private businesses since 1 April 2024. Making the website itself accessible is classed as *environmental improvement* (環境の整備), an **effort duty** (努力義務). So no Japanese law currently mandates WCAG/JIS conformance for a private property-search site.
- **What must be given on request.** The operator must still give a reasonable, non-burdensome alternative when a disabled user asks, e.g., staff-assisted area search by phone or email, or an accessible list or ward search.
- **Practical target.** Industry and government practice treats JIS X 8341-3 AA as the target. The public sector is expected to meet AA via 総務省's みんなの公共サイト運用ガイドライン.

### Cited Findings
- JIS X 8341-3:2016 was published 22 March 2016 and matches ISO/IEC 40500:2012, i.e., WCAG 2.0. — [issoh.co.jp column](https://www.issoh.co.jp/column/details/3022/); [gihyo.jp 2026](https://gihyo.jp/article/2026/01/web-accessibility-prospect)
- Revision status:
  - 中村直樹 (Mitsue-Links), gihyo.jp, 2026-01-06 [fetched]: "昨年10月に JIS X 8341-3改正原案作成委員会が発足" (the revision drafting committee formed in October 2025). The revised JIS is intended as an identical adoption of ISO/IEC 40500:2025 (WCAG 2.2). "今年中にも改正JISが発行される見込みです" (expected this year). — [gihyo.jp "2026年のWebアクセシビリティ"](https://gihyo.jp/article/2026/01/web-accessibility-prospect)
  - A March 2026 conference deck projected publication "早ければ2026年10月、遅くとも2027年3月" (as early as Oct 2026, at the latest Mar 2027). Whether to fold in errata up to 2025 was still under discussion (secondary, via search summary). — [Speaker Deck: 改正JISを見据えた…ロードマップ](https://speakerdeck.com/securecat/gai-zheng-jiswojian-ju-eta-qi-ye-noakusesibiriteidui-ying-rodomatupu)
  - An article updated 2026-10-12 still described the JIS revision as in progress, not published (via search summary). — [issoh.co.jp column 7575](https://www.issoh.co.jp/md/column/7575)
- Conformance claims under JIS X 8341-3:2016 ("準拠" etc.) are governed in practice by WAIC's 「JIS X 8341-3:2016 対応度表記ガイドライン」. — [issoh.co.jp column](https://www.issoh.co.jp/column/details/3022/) (secondary; see [WAIC](https://waic.jp/) for the primary)
- Law, 合理的配慮 and 環境の整備: a 内閣府 (Cabinet Office) March 2026 material states that reasonable accommodation by businesses became mandatory from April 2024 and that an effort duty for 環境の整備 is also prescribed ("※事業者は2024年４月から義務化 ※環境の整備の努力義務も規定"). Article 5: "社会的障壁の除去の実施についての必要かつ合理的な配慮を的確に行うため…環境の整備に努めなければならない". — via search summary of [内閣府 materials](https://www8.cao.go.jp/shougai/whitepaper/r04hakusho/zenbun/h2_01_03.html); statute at [e-Gov 障害者差別解消法](https://laws.e-gov.go.jp/law/425AC0000000065) (not fetched)
- 環境の整備 is described as advance improvement for unspecified, numerous disabled people, contrasted with individual 合理的配慮, and it *includes improving information accessibility*. — [京都市 資料](https://www.city.kyoto.lg.jp/hokenfukushi/cmsfiles/contents/0000192/192671/jireisyuu-3-1.pdf) (via search summary). An Osaka Prefecture case book example is "ホームページ等にて…音声読み上げや文字拡大機能を付ける" (add text-to-speech and text enlargement to the website), listed under 環境の整備. — [大阪府 事例集](https://www.pref.osaka.lg.jp/documents/30751/zirei_kannkyoutosonota.pdf)
- The 基本方針 (令和5年3月閣議決定, revised Basic Policy) lists "障害者による円滑な情報の取得・利用・発信のための情報アクセシビリティの向上等" (improving information accessibility so disabled people can smoothly obtain, use and send information) as an advance-improvement measure to be implemented as 環境の整備 [recalled wording; search confirmed the phrase context but the primary text was not fetched]. — [内閣府 障害者差別解消法 page](https://www8.cao.go.jp/shougai/suishin/sabekai.html)
- gihyo.jp 2026 [fetched]: under this law, web accessibility falls under 環境の整備, which is "努力義務にしか過ぎません" (merely an effort duty). The 2022 障害者情報アクセシビリティ・コミュニケーション施策推進法 (information accessibility promotion act) is described as having thin practical effect ("実効性が薄いといわざるを得ません"). A privately drafted "デジタルアクセシビリティ法" (digital accessibility act) proposal exists, but no such law has been enacted. — [gihyo.jp 2026](https://gihyo.jp/article/2026/01/web-accessibility-prospect)
- A secondary technical write-up notes that a government site's explanation, which had called web accessibility 合理的配慮, was later corrected to 環境の整備. Commentary: the 2024 amendment made 合理的配慮 mandatory, "ウェブサイトのアクセシビリティ自体が義務化されるのではありません" (website accessibility itself did not become mandatory). — [zenn.dev/ymrl](https://zenn.dev/ymrl/articles/62f90ebcce7637); [webtan (Impress) 2024-04-09](https://webtan.impress.co.jp/e/2024/04/09/46700) (secondary)
- デジタル庁 ウェブアクセシビリティ導入ガイドブック [fetched]:
  - Audience: "ウェブアクセシビリティに初めて取り組む行政官の方や事業者向け" (government staff and businesses new to web accessibility).
  - Last updated 2025-10-16, when it was "デジタル社会推進標準ガイドラインにInformative文書として編入" (incorporated as an Informative document into the Digital Society Promotion Standard Guidelines).
  - It references JIS X 8341-3:2016 as the commonly cited standard and covers newer issues "（スマートフォン対応等）" (smartphone support, etc.). A 2023-11-10 revision aligned wording to JIS success criteria.
  - The landing page does not mention 合理的配慮 / 環境の整備 or a target level. A companion 広報向けガイドブック (guidebook for PR staff) was also published.
  — [デジタル庁 guidebook page](https://www.digital.go.jp/resources/introduction-to-web-accessibility-guidebook); [gihyo.jp 2026](https://gihyo.jp/article/2026/01/web-accessibility-prospect)
- Relevant sector guideline (pointer only, not fetched): 国土交通省 (MLIT) publishes the 対応指針 (sector guideline) for its sectors, including 宅地建物取引業 (real estate brokerage). — [MLIT 対応指針 PDF](https://www.mlit.go.jp/common/001068263.pdf)
- Public sector: 総務省 みんなの公共サイト運用ガイドライン asks national and local government sites to meet JIS X 8341-3 Level AA. — [総務省 guideline page](https://www.soumu.go.jp/main_sosiki/joho_tsusin/b_free/guideline.html) [recalled; latest edition year not verified this session]

### Inferences
- **For a private property/POI portal in Japan:**
  - (1) There is no statutory duty to conform to JIS X 8341-3 or WCAG 2.2.
  - (2) There is a binding duty (since 2024-04-01) to respond to an individual's expressed request with a reasonable accommodation unless it is an excessive burden (過重な負担). A blind or motor-impaired user who cannot trace on the map could request an alternative. Offering ward/station/line search, a vertex or radius tool, or staff assistance is how the operator would discharge it.
  - (3) Building those alternatives in advance is exactly what 環境の整備 (an effort duty) envisions, and it reduces individual-accommodation load.
  - (4) The relevant 主務大臣 (minister in charge, MLIT for real estate brokerage) can request reports and give advice, guidance or recommendations. There are no direct penalties for failing to provide accommodation; only false reporting or failure to report is fined [recalled; not verified this session].
- Teams targeting WCAG 2.2 AA now will be "JIS-revision-ready". The new JIS is expected to be WCAG 2.2-identical, adding 2.5.7, 2.5.8 and 2.4.11, which are the criteria most relevant to this feature. Under the current JIS:2016 (WCAG 2.0), 2.5.x and 1.4.10/1.4.11/1.4.13/4.1.3 are *not* part of JIS conformance.

### Gaps
- Whether the revised JIS X 8341-3 was 公示 (officially published) by 2026-10-29 could not be confirmed. Check JISC / 官報 (the official gazette) directly.
- I found no public enforcement action or court case in Japan concerning a private website's accessibility under 障害者差別解消法.
- The verbatim 基本方針 text and the MLIT 対応指針 examples for real-estate brokerage were not fetched.
- The latest edition of みんなの公共サイト運用ガイドライン (2016 vs. a newer edition) was not verified.

---

## Q4. US and EU in brief: ADA Title III trend, DOJ Title II rule and deadlines, European Accessibility Act scope and microenterprise exemption

### Takeaway
- **US private sites.** There is still no Title III web regulation. Litigation rose in 2025: 3,117 federal website suits, +27%. Courts and settlements de facto use WCAG 2.1 AA.
- **DOJ Title II** (state and local government): WCAG 2.1 AA. An interim final rule of 20 April 2026 moved compliance dates to **26 Apr 2027** (population ≥50k) and **26 Apr 2028** (smaller entities and special districts).
- **EU.** The EAA has applied since 28 June 2025. It covers "e-commerce services" to consumers and exempts microenterprises providing services. The technical reference is EN 301 549 (WCAG 2.1 AA for web). Whether a real-estate listing portal is an "e-commerce service" is unclear.

### Cited Findings
- **DOJ Title II.**
  - Interim final rule published in the Federal Register 2026-04-20 (doc 2026-07663), effective immediately, comments due 2026-06-22.
  - Large entities: "extended from April 24, 2026, to April 26, 2027". Small entities and special districts: "extended from April 26, 2027, to April 26, 2028".
  - It "does not change the technical standard adopted in 2024" (WCAG 2.1 AA).
  - DOJ is considering separate K-12 rulemaking.
  — [Federal Register](https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web); [Plante Moran](https://plantemoran.com/explore-our-thinking/insight/2026/04/doj-extends-ada-title-ii-web-accessibility-compliance-deadlines); [NFB objection](https://nfb.org/node/16506)
- One firm (Jackson Lewis) gives the original deadline as 22 April 2026. The Federal Register says 24 April 2026, and it controls. — [Jackson Lewis](https://www.jacksonlewis.com/node/32560); [Federal Register](https://www.federalregister.gov/documents/2026/04/20/2026-07663/extension-of-compliance-dates-for-nondiscrimination-on-the-basis-of-disability-accessibility-of-web)
- **ADA Title III trend** (secondary, citing Seyfarth Shaw):
  - 3,117 federal website-accessibility suits in 2025, +27% vs. 2,452 in 2024, the highest since 2022 (3,255 peak). Website cases were 36% of all Title III federal filings.
  - "WCAG 2.1 Level AA is the de facto standard used by courts".
  - UsableNet counts 25,000+ digital suits 2018–2025 including state courts.
  — [Level Access](https://www.levelaccess.com/blog/web-accessibility-lawsuits); [TestParty compilation](https://testparty.ai/blog/ada-title-iii-lawsuit-trends) (secondary; the Seyfarth report itself was not fetched)
- **EAA.**
  - E-commerce is among the covered services. — [European Commission EAA page](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en) [fetched]
  - Microenterprise = fewer than 10 staff and turnover or balance sheet ≤ €2m. The exemption is for *services* only. — [e-include.eu](https://e-include.eu/web-accessibility/european-accessibility-act/); [askem](https://askem.com/compliance/eaa/) (secondary)
  - Directive text [recalled; EUR-Lex fetch failed in this session, verify]:
    - Art. 3(30) "'e-commerce services' means services provided at a distance, through websites and mobile device-based services by electronic means and at the individual request of a consumer with a view to concluding a consumer contract".
    - Art. 4(5) "Microenterprises providing services shall be exempt from complying with the accessibility requirements…".
    - Art. 31(2): Member States apply the measures from 28 June 2025.
    - Art. 32(1): transitional periods. Products already in use for services until 28 June 2030; pre-existing service contracts until they expire, max 5 years.
    - Annex I Section IV(c): websites and mobile services accessible "in a consistent and adequate way … by making them perceivable, operable, understandable and robust".
    — [Directive (EU) 2019/882 on EUR-Lex](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng)
- EN 301 549 V3.2.1 (2021) incorporates WCAG 2.1 AA for web. It is cited in the OJ via Implementing Decision (EU) 2021/1339 (for the Web Accessibility Directive). One source states that no EAA-specific harmonised standard had been published, which conflicts with sources treating V3.2.1 as the EAA reference. — [koksal.av.tr](https://koksal.av.tr/en/legislation/eu-accessibility-act-eaa-germanys-bfsg/); [webability.io](https://www.webability.io/blog/european-accessibility-act-2025-deadline) (secondary, conflicting)

### Inferences
- **US.** A private Japanese portal with no US consumer business is unlikely to face Title III exposure. If it serves US users, freehand-only area search with no alternative would be a plausible complaint item (2.5.x are WCAG 2.2, but 2.1.1 Keyboard alone, which is in WCAG 2.1, already requires the alternative).
- **EU.**
  - A property portal where consumers browse listings and *contact agents* (contract concluded offline) may fall outside "with a view to concluding a consumer contract". Booking, rental-application or paid-service flows completed online are more clearly in scope.
  - A microenterprise operator is exempt.
  - Any EU-facing deployment should assume EN 301 549 / WCAG 2.1 AA. WCAG 2.1 lacks 2.5.7 and 2.5.8, but 2.1.1 and 2.5.1 still force the non-path alternative.

### Gaps
- EAA applicability to real-estate listing portals: I found no authoritative guidance or national transposition interpretation.
- Status of a revised EN 301 549 (V4, WCAG 2.2-based) or an EAA-harmonised standard as of Oct 2026: not verified.
- Whether DOJ revised or withdrew its 2022 Title III web guidance in 2025–2026: not researched.

---

## Q5. Do WCAG 2.2 or WCAG 3 drafts say anything specific about maps or gesture-based selection?

### Takeaway
WCAG 2.2 has no map-specific SC. Maps appear only as examples in Understanding docs (1.4.10, 2.5.7, 2.5.8, and recalled 2.5.1). Gesture rules are 2.5.1 (path/multipoint), 2.5.7 (dragging) and 2.1.1 (path-dependent exception tied to the underlying function). I did not verify any WCAG 3 draft content on maps.

### Cited Findings
- WCAG 2.2 (Rec. 12 Dec 2024) map mentions: Reflow Note 2 "maps and diagrams" as 2-D content [fetched], the 2.5.7 map-pan example [fetched], and the 2.5.8 pins "Essential" example [fetched]. — [Understanding 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html); [Understanding 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html); [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- The 2.1.1 path-dependent exception covers "Free hand drawing, or watercolor painting" but turns on the underlying function [fetched]. — [Understanding 2.1.1](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)

### Inferences
- **Component-to-SC matrix** (synthesised from Q1a–Q1e):
  - **Trace "なぞる" button:**
    - 4.1.2: toggle role and aria-pressed, plus a name.
    - 2.5.8: at least 24×24 px.
    - 1.4.11: 3:1 boundary and state.
    - 2.4.7: visible focus.
    - 2.5.2: activate on click/up.
    - 1.4.1: the active state is not shown by colour only.
  - **Drawing overlay / mode:**
    - 2.1.1 and 2.5.7/2.5.1: equivalent non-path, non-drag, keyboard-operable method on the same page.
    - 2.1.2: Esc/Cancel exits.
    - 2.5.2: abort (Esc, off-map release) or undo (Clear).
    - 2.4.3: focus moves to the mode controls.
    - 1.4.10: the toolbar reflows.
    - 3.3.2 (not asked, but related): instructions on how to draw.
  - **Drawn polygon:**
    - 1.4.11: 3:1 outline against tiles; use two-tone strokes.
    - 1.4.1: inside vs. outside not by colour alone.
    - 1.3.1 and 1.1.1: text summary of the area.
    - Vertex handles, if editable: 2.5.8, 4.1.2 and 2.4.7.
  - **Map pan/zoom:**
    - 2.5.7: pan buttons or alternative.
    - 2.5.1: +/− for pinch.
    - 2.1.1: keyboard pan and zoom.
    - 2.1.2: Tab out.
    - 1.4.10: 2-D exempt.
    - 1.1.1: named map region.
  - **Cluster count badges:**
    - 1.4.3: 4.5:1 text.
    - 1.4.11: 3:1 shape.
    - 4.1.2: button plus name with the count.
    - 2.5.8: ≥24 px or the Essential exception plus the list alternative.
    - 2.4.7 and 2.4.11: focus visible and not obscured.
    - 1.4.13: if hover previews exist.
  - **Result list:**
    - 1.3.1: semantics.
    - 1.1.1: equivalent of the map.
    - 4.1.3: count announced.
    - 2.4.3: order.
    - 1.4.10: reflow.
    - 2.4.11: not hidden by a sticky sheet.
  - **Error / empty states:**
    - 3.3.1: text identification.
    - 3.3.3: suggestion.
    - 4.1.3: role=alert or status.
    - 1.4.1: not colour-only.
  - **Auto-search on lift or pan:**
    - 3.2.2: no change of context without advice.
    - 4.1.3: announce updates.
  - **Alternatives** (vertex polygon, radius, "search this area", station/ward/line lists, isochrones): satisfy 2.1.1, 2.5.1, 2.5.7 and the 2.5.8 Equivalent exception. They must themselves meet all of the above, e.g., a radius slider needs a single-tap or select alternative per 2.5.1/2.5.7.

### Gaps
- WCAG 3: I did not fetch any WCAG 3 Working Draft in this session. I cannot state whether current drafts contain map- or gesture-specific outcomes. The report should treat this as unknown rather than infer.
- WCAG 2.2 conformance under Japanese JIS will not exist until the revised JIS is published (see Q3).
