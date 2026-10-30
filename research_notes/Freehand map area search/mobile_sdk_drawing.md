# Freehand finger-tracing of a search area on Google Maps: mobile SDK implementation (Android, iOS, React Native, Flutter)

Scope: native and cross-platform mobile implementation only. Web/JS, search backends, and UX alternatives are covered by other researchers. As of 2026-10-29.

Common pattern across every platform (Google publishes no official "freehand lasso" API or sample on any mobile SDK, so you build it from primitives):
1. Draw mode: turn off the map's scroll/pan gesture (and ideally rotate/tilt) and/or put a transparent touch-capturing view on top of the map.
2. Capture: collect finger positions (screen points) from the overlay's drag/pan events.
3. Convert: screen point -> lat/lng through the map's projection (sync on native, async on RN/Flutter).
4. Render: draw a live stroke (in screen space on the overlay, or as a map Polyline), then replace it with a map Polygon when the finger lifts.
5. Filter: run point-in-polygon on result coordinates (client-side utils), or send the polygon to the backend.

---

## Android: Maps SDK for Android (Views) and Maps Compose

### Takeaway
Everything you need is in the official SDK plus android-maps-utils. Use `UiSettings.setScrollGesturesEnabled(false)` (Compose: `MapUiSettings(scrollGesturesEnabled = false)`) and an overlay that captures touches (a View `onTouchEvent`, or a Compose `Canvas` + `pointerInput`). Convert points with `Projection.fromScreenLocation(Point)` (Compose: `cameraPositionState.projection`). Draw with `Polyline`/`Polygon`, and filter with `PolyUtil.containsLocation`, plus `PolyUtil.simplify` to reduce the point count. A conference talk from Oct 2026 describes a production version of exactly this pattern on Google Maps Android with Compose.

### Cited Findings
- **Suspending pan:** `UiSettings.setScrollGesturesEnabled(boolean enabled)` "Sets the preference for whether scroll gestures should be enabled or disabled." There is also `setScrollGesturesEnabledDuringRotateOrZoom` — [Android UiSettings reference](https://developers.google.com/android/reference/com/google/android/gms/maps/UiSettings)
- **Maps Compose equivalent:** `MapUiSettings` has `scrollGesturesEnabled`, `zoomGesturesEnabled`, `rotationGesturesEnabled`, `tiltGesturesEnabled` and `scrollGesturesEnabledDuringRotateOrZoom` (all default `true`) — [android-maps-compose MapUiSettings.kt](https://github.com/googlemaps/android-maps-compose/blob/main/maps-compose/src/main/java/com/google/maps/android/compose/MapUiSettings.kt)
- **Screen to lat/lng:** `Projection.fromScreenLocation(Point point)` "Returns the geographic location that corresponds to a screen location." The page also notes "The fromScreenLocation method returns the geographic location (LatLng) corresponding to a given screen location (Point)." — [Android Projection reference](https://developers.google.com/android/reference/com/google/android/gms/maps/Projection)
- **Units:** Screen location for the projection is "in screen pixels (not display pixels)" relative to the top-left of the map, not the whole screen. This wording appears in the google_maps_flutter wrapper doc, which calls Android `fromScreenLocation` directly. Android `MotionEvent` x/y are already in physical pixels, so no density conversion is needed natively — [google_maps_flutter controller.dart](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter/lib/src/controller.dart); [google_maps_flutter_android GoogleMapController.java](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter_android/android/src/main/java/io/flutter/plugins/googlemaps/GoogleMapController.java)
- **Compose projection access:** `CameraPositionState.projection: Projection?` (`get() = map?.projection`) "Returns the current Projection to be used for converting between screen coordinates and lat/lng." It is nullable until the map is loaded — [android-maps-compose CameraPositionState.kt](https://github.com/googlemaps/android-maps-compose/blob/main/maps-compose/src/main/java/com/google/maps/android/compose/CameraPositionState.kt)
- **Current versions:** android-maps-compose latest release is v9.0.1 (2026-10-08). android-maps-utils latest is v6.1.0 (2026-10-21) — [maps-compose releases](https://github.com/googlemaps/android-maps-compose/releases); [android-maps-utils releases](https://github.com/googlemaps/android-maps-utils/releases)
- **`PolyUtil.containsLocation`:** `containsLocation(point: LatLng, polygon: List<LatLng>, geodesic: Boolean): Boolean` (plus a lat/lng-double overload) "Computes whether the given point lies inside the specified polygon." The polygon is always treated as closed, and the South Pole is always outside. Segments are great circles if `geodesic` is true, rhumb (loxodromic) segments otherwise — [PolyUtil API docs](https://googlemaps.github.io/android-maps-utils/library/com.google.maps.android/-poly-util/index.html)
- **`PolyUtil.simplify`:** `simplify(poly: List<LatLng>, tolerance: Double): List<LatLng>` uses the Douglas-Peucker decimation algorithm. A higher tolerance gives fewer points. Related helpers are `isClosedPolygon(poly)` (first point == last point) and `isLocationOnEdge(point, polygon, geodesic, tolerance)`, where tolerance is in meters and defaults to 0.1 — [PolyUtil API docs](https://googlemaps.github.io/android-maps-utils/library/com.google.maps.android/-poly-util/index.html)
- **Production reference (DevFest Venezia 2026, 24 Oct 2026):** István Juhos (Staff Android Engineer, Spoke) gave the talk "Paths, Polygons and Donuts: building a freehand drawing tool for maps". It uses Google Maps Android SDK with a Compose `Canvas` overlay on top of the map. The overlay uses `Modifier.sharePointerInputWithSiblings().pointerInput(Unit)` with `eagerDetectDragGestures`. `onDrag` appends `change.position` to a screen-point list. All points are converted only once, in `onDragEnd`, via `projection.fromScreenLocation(...)`. The stroke is an Android `Path` (`moveTo`/`lineTo`), and the fill path is built with `addPath(strokePath)` + `close()` — [Speaker Deck](https://speakerdeck.com/stewemetal/paths-polygons-and-donuts-building-a-freehand-drawing-tool-for-maps-devfest-venezia-2026-edition)
- **Self-intersection fix from the same talk:** a stroke that crosses itself makes different inside-checks disagree. The fix is to "UNION with itself" via `Path.op(...)` to get "One clean outline, no crossings: every check agrees." Raw lat/lng as floats put points "on the wrong side" ("A float keeps about seven digits"), so coordinates are normalized to a 0–10,000 range before `Path.Op` and then denormalized. `Path.FillType.EVEN_ODD` handles holes ("donuts"). Boolean ops are skipped when bounding boxes don't intersect — [Speaker Deck](https://speakerdeck.com/stewemetal/paths-polygons-and-donuts-building-a-freehand-drawing-tool-for-maps-devfest-venezia-2026-edition)
- **Compose tutorial:** a two-part ProAndroidDev series, "Free hand draw polygon in Google Maps Compose". Part 1 captures touches with a Compose Canvas + `pointerInput`. Part 2 converts points with the projection from the camera state (`fromScreenLocation`). The direct fetch returned HTTP 403, so details come from search snippets — [Part 1](https://proandroiddev.com/free-hand-draw-polygon-in-google-maps-compose-8332e0f3ab69); [Part 2](https://proandroiddev.com/free-hand-draw-polygon-in-google-maps-compose-part-2-4090cbaf4015)
- **Older View-based libraries (unmaintained):** `bkhezry/MapDrawingTools` lets users draw polygons, polylines and points by tapping, and returns coordinates. It has 144 stars and was last pushed 2019-07-11. `devendroid/MapDrawingManager` draws shapes with an editable mode. It has 55 stars and was last pushed 2019-12-09 — [MapDrawingTools](https://github.com/bkhezry/MapDrawingTools); [MapDrawingManager](https://github.com/devendroid/MapDrawingManager)
- **Same pattern on Mapbox (non-Google):** Mapbox's legacy "finger draw query" Android example uses a touch listener that collects finger points, draws a freehand line and fill, and queries features inside the polygon — [Mapbox finger-draw-query](https://docs.mapbox.com/android/legacy/maps/examples/finger-draw-query/)
- **No Compose samples in the official repo:** the official android-maps-compose repo has no freehand-drawing sample. A code search for `fromScreenLocation` there only hits the ScaleBar widget and tests — [android-maps-compose repo](https://github.com/googlemaps/android-maps-compose)

### Inferences
- **Recommended Android recipe:**
  - Put the map in a `Box` with an overlay `Canvas` that is only enabled in draw mode.
  - In draw mode, set `MapUiSettings(scrollGesturesEnabled=false, rotationGesturesEnabled=false, tiltGesturesEnabled=false)`. The overlay usually consumes the touches anyway, but disabling gestures also guards against multi-touch leaking through.
  - Accumulate `Offset`s and draw the live stroke on the Canvas in screen space. This is cheap, with no map-object churn per move event.
  - On drag end, map each point through `cameraPositionState.projection!!.fromScreenLocation(Point(x.toInt(), y.toInt()))`.
  - Run `PolyUtil.simplify`, render a `Polygon(points=...)` composable, then filter with `PolyUtil.containsLocation(..., geodesic=false)`.
  - The View-system equivalent is a transparent `View` over `MapView`/`SupportMapFragment` that overrides `onTouchEvent`, with `googleMap.uiSettings.isScrollGesturesEnabled = false` and `googleMap.projection.fromScreenLocation(...)`.
- **Prefer `geodesic=false`:** a finger stroke drawn as straight screen segments on a Web Mercator map follows rhumb lines, and `geodesic=false` gives rhumb segments. For city-scale property searches the difference is negligible either way.
- **Lock the camera:** the projection is only valid for the current camera. Don't let the camera move mid-stroke, which is another reason to disable scroll/zoom in draw mode.

### Gaps
- The `simplify` tolerance unit is not stated on the PolyUtil Dokka page fetched. The library source javadoc is commonly cited as meters, but that was not verified here.
- The `sharePointerInputWithSiblings` and `eagerDetectDragGestures` APIs named in the talk were not checked against Compose docs. `eagerDetectDragGestures` may be a custom helper.
- No official Google sample for freehand drawing on Android was found.

---

## iOS: Google Maps SDK for iOS, and Apple MapKit (UIKit + SwiftUI) for comparison

### Takeaway
- **Google Maps SDK for iOS:** set `mapView.settings.scrollGestures = false`, add an overlay `UIView` with a `UIPanGestureRecognizer` (or `touchesMoved`), convert with `mapView.projection.coordinate(for: CGPoint)` (synchronous, takes points), build a `GMSMutablePath`, render with `GMSPolyline`/`GMSPolygon`, and test with `GMSGeometryContainsLocation(point, path, geodesic)`.
- **MapKit (the Japanese app's stack):** `MKMapView.isScrollEnabled = false` + `convert(_:toCoordinateFrom:)` + `MKPolygon`/`MKPolygonRenderer`.
- **SwiftUI `Map` (iOS 17+):** `MapReader`/`MapProxy.convert(_:from:)` + `interactionModes` + `MapPolygon`/`MapPolyline`.
- Both iOS SDKs make this feasible. Google Maps iOS has no built-in polyline simplification.

### Cited Findings
- **Google: suspending pan.** `GMSUISettings` has a `scrollGestures` property (also `allowScrollGesturesDuringRotateOrZoom`) — [GMSUISettings reference](https://developers.google.com/maps/documentation/ios-sdk/reference/objc/Classes/GMSUISettings)
- **Google: screen to coordinate.** `GMSProjection` has `- (CLLocationCoordinate2D)coordinateForPoint:(CGPoint)point;` (Swift: `coordinate(for:)`), which takes a CGPoint in points — [GMSProjection reference](https://developers.google.com/maps/documentation/ios-sdk/reference/objc/Classes/GMSProjection)
- **Google: point-in-polygon.** `func GMSGeometryContainsLocation(_ point: CLLocationCoordinate2D, _ path: GMSPath, _ geodesic: Bool) -> Bool`:
  - The path is always treated as closed, and the South Pole is always outside.
  - Segments are great circles if `geodesic` is YES, rhumb otherwise.
  - A point exactly matching a vertex returns YES.
  - Use `GMSGeometryIsLocationOnPath` / `GMSGeometryIsLocationOnPathTolerance` (meters) for border tests.
  - Source: [GMS geometry functions reference](https://developers.google.com/maps/documentation/ios-sdk/reference/objc/Functions)
- **Google: no simplification.** The GMS functions reference documents containment, distance, length, area, heading, offset, interpolation and style spans, but no path simplification function — [GMS functions reference](https://developers.google.com/maps/documentation/ios-sdk/reference/objc/Functions)
- **How the Flutter plugin converts on iOS:** google_maps_flutter's iOS implementation passes the Dart coordinate straight to `[mapView.projection coordinateForPoint:point]`, i.e. in iOS points — [FGMGoogleMapController.m](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter_ios/ios/google_maps_flutter_ios/Sources/google_maps_flutter_ios/FGMGoogleMapController.m)
- **MapKit (UIKit), conversion:** `func convert(_ point: CGPoint, toCoordinateFrom view: UIView?) -> CLLocationCoordinate2D` "Converts a point in the specified view's coordinate system to a map coordinate" (iOS 3.0+) — [Apple: MKMapView.convert(_:toCoordinateFrom:)](https://developer.apple.com/documentation/mapkit/mkmapview/convert(_:tocoordinatefrom:))
- **MapKit (UIKit), suspending pan:** `var isScrollEnabled: Bool` "determines whether the user may scroll around the map" — [Apple: isScrollEnabled](https://developer.apple.com/documentation/mapkit/mkmapview/isscrollenabled)
- **MapKit point-in-polygon building blocks:**
  - `MKPolygonRenderer` is "the visual representation of a single polygon overlay" (iOS 7+) — [Apple: MKPolygonRenderer](https://developer.apple.com/documentation/mapkit/mkpolygonrenderer)
  - `MKOverlayPathRenderer.path: CGPath!` is "the path representing the overlay's shape" — [Apple: MKOverlayPathRenderer.path](https://developer.apple.com/documentation/mapkit/mkoverlaypathrenderer/path)
  - `MKOverlayRenderer.point(for: MKMapPoint) -> CGPoint` converts a map point into the renderer's drawing space — [Apple: point(for:)](https://developer.apple.com/documentation/mapkit/mkoverlayrenderer/point(for:))
  - Together these give the classic test `renderer.path.contains(renderer.point(for: MKMapPoint(coord)))`.
- **SwiftUI Map (iOS 17+):**
  - `MapReader` (iOS 17.0+) is "a container view that defines its contents as a function of information about the first contained map" — [Apple: MapReader](https://developer.apple.com/documentation/mapkit/mapreader)
  - `MapProxy` (iOS 17.0+, macOS 14.0+) provides `convert(_ point: CGPoint, from space: some CoordinateSpaceProtocol) -> CLLocationCoordinate2D?` ("Converts a point in the specified coordinate space to a map coordinate") and `convert(_:to:)` for the reverse — [Apple: MapProxy](https://developer.apple.com/documentation/mapkit/mapproxy); [Apple: convert(_:from:)](https://developer.apple.com/documentation/mapkit/mapproxy/convert(_:from:))
  - `MapPolygon` ("A closed polygon overlay") and `MapPolyline` are SwiftUI map content types, iOS 17.0+ — [Apple: MapPolygon](https://developer.apple.com/documentation/mapkit/mappolygon); [Apple: MapPolyline](https://developer.apple.com/documentation/mapkit/mappolyline)
  - `MapInteractionModes` (iOS 14+) has the options `.all`, `.pan`, `.zoom`, `.pitch`, `.rotate`, and is used to restrict which gestures the SwiftUI Map responds to — [Apple: MapInteractionModes](https://developer.apple.com/documentation/mapkit/mapinteractionmodes)
- **SwiftUI usage pattern and caveats:**
  - The common pattern is `MapReader { proxy in Map().onTapGesture { p in proxy.convert(p, from: .local) } }` — [Hacking with Swift](https://www.hackingwithswift.com/books/ios-swiftui/communicating-with-a-mapkit-coordinator); [Level Up Coding](https://levelup.gitconnected.com/swiftui-mapkit-convert-screen-coordinates-to-actual-geographical-location-d15a35ec51d0)
  - A macOS 14.3.1 user reported a ~25 pt Y offset with `.local` and worked around it with a named coordinate space — [Apple Developer Forums 737044](https://developer.apple.com/forums/thread/737044)
  - Forum guidance: `MapProxy` handles conversions, not camera tracking; use `.onMapCameraChange` for that — [Apple Developer Forums 733371](https://developer.apple.com/forums/thread/733371)

### Inferences
- **Google Maps iOS recipe:**
  - Add a clear `UIView` above `GMSMapView`, with `isUserInteractionEnabled` toggled by the "trace" button and a `UIPanGestureRecognizer`.
  - In draw mode set `mapView.settings.scrollGestures = false` (optionally `zoomGestures`/`rotateGestures`/`tiltGestures` too).
  - On `.changed`, take `location(in: mapView)` and either draw a `CAShapeLayer` stroke on the overlay (cheapest), or append `mapView.projection.coordinate(for:)` to a `GMSMutablePath` and reassign `polyline.path`.
  - On `.ended`, build a `GMSPolygon(path:)`, set `map = mapView`, and filter with `GMSGeometryContainsLocation(coord, path, false)`.
  - Because GMS has no simplify function, add your own Douglas-Peucker in screen space before converting, or use a distance threshold while sampling.
- **MapKit is the same shape:** the Japanese app likely uses `MKMapView` + overlay gesture + `convert(_:toCoordinateFrom:)` + `MKPolygon`. Porting to Google Maps iOS is close to 1:1: `isScrollEnabled` -> `settings.scrollGestures`, `convert` -> `projection.coordinate(for:)`, `MKPolygon` -> `GMSPolygon`, renderer path test -> `GMSGeometryContainsLocation`.
- **Better MapKit point-in-polygon:** a renderer's `path` may only exist once the renderer has created it. Running your own ray-casting on `MKMapPoint`s (planar Mercator, matching what the user drew) avoids depending on renderer state. This is not verified in the docs.
- **SwiftUI Map approach:** set `interactionModes` to exclude `.pan` in draw mode (e.g. `[]` or `[.zoom]`), then overlay a `Color.clear.contentShape(Rectangle())` with `DragGesture(minimumDistance: 0)` in the same coordinate space and convert with `proxy.convert(_:from:)`. This needs iOS 17+. On older iOS, wrap `MKMapView` in `UIViewRepresentable`. Google Maps iOS has no SwiftUI-native Map, so you'd wrap `GMSMapView` in `UIViewRepresentable` either way.

### Gaps
- The exact Swift name (`coordinate(for:)`) and the `GMSPolyline`/`GMSPolygon`/`GMSMutablePath` APIs come from the long-standing iOS SDK, not from a page fetched this session. The GMSProjection reference fetch confirmed only the ObjC `coordinateForPoint:` signature.
- Whether `Map(interactionModes:)` is the current non-deprecated initializer parameter in the iOS 17/18+ `Map` API (vs. `MapInteractionModes` only applying to the older iOS 14 initializers) was not verified.
- Whether Google's iOS Utils library (google-maps-ios-utils) offers a polyline simplify was not checked.

---

## React Native: react-native-maps (and Expo)

### Takeaway
react-native-maps already supports freehand capture with no extra library. Its official example `PolygonCreator.tsx` switches to `scrollEnabled={false}` plus `onPanDrag`, and each pan event delivers a native-computed `{coordinate, position}`, so there is no per-point async conversion. The alternative is an overlay (RNGH/PanResponder + react-native-svg) with `mapRef.coordinateForPoint()`, which returns a Promise per point. The only dedicated library, `@dev-event/react-native-maps-draw`, is effectively abandoned. react-native-maps itself is actively maintained, supports the New Architecture, and works in Expo.

### Cited Findings
- **Library status:** react-native-maps latest is 1.29.11 (npm modified 2026-09-27). Peer deps are `react >= 18.3.1` and `react-native >= 0.76.0`. Per the README's Fabric (New Architecture) table, 1.26.1+ requires RN >= 0.81.1 and 1.26.0 and below requires RN >= 0.76 — [npm registry `npm view react-native-maps`](https://www.npmjs.com/package/react-native-maps); [react-native-maps README](https://github.com/react-native-maps/react-native-maps/blob/master/README.md)
- **MapView API:**
  - `scrollEnabled` (Boolean, default true): "If `false` the user won't be able to change the map region being displayed."
  - Also `zoomEnabled`, `rotateEnabled`, `pitchEnabled`, and the Google-only `scrollDuringRotateOrZoomEnabled`.
  - `coordinateForPoint(point: Point)` "Converts a view coordinate (Point) to a map coordinate. Returns a Promise<Coordinate>." `pointForCoordinate` is the reverse.
  - `onPanDrag` gives `{ coordinate: LatLng, position: Point, numberOfTouches: number }` and is "called when user presses and drags the map" (`numberOfTouches` is iOS only).
  - Source: [react-native-maps docs/mapview.md](https://github.com/react-native-maps/react-native-maps/blob/master/docs/mapview.md)
- **Official freehand example:** the repo example `PolygonCreator.tsx` does, in editing mode:
  ```tsx
  if (this.state.editing) {
    mapOptions.scrollEnabled = false;
    mapOptions.onPanDrag = (e: any) => this.onPress(e);
  }
  ```
  and appends `e.nativeEvent.coordinate` to the polygon being edited (rendered with `<Polygon coordinates=...>`) — [PolygonCreator.tsx](https://github.com/react-native-maps/react-native-maps/blob/master/example/src/examples/PolygonCreator.tsx)
- **Native implementation:**
  - On Android, `MapView.java` emits `onPanDrag(e2)` from a `GestureDetector.onScroll` callback when `handlePanDrag` is true. This is on the wrapper view's touch stream, so it still fires when the Google map's own scrolling is disabled — [MapView.java](https://github.com/react-native-maps/react-native-maps/blob/master/android/src/main/java/com/rnmaps/maps/MapView.java)
  - On iOS (Apple Maps provider), `AIRMapManager.m` attaches a `UIPanGestureRecognizer` (`handleMapDrag:`) and exports `handlePanDrag`/`onPanDrag` — [AIRMapManager.m](https://github.com/react-native-maps/react-native-maps/blob/master/ios/AirMaps/AIRMapManager.m)
  - The Google provider on iOS (Fabric) emits `onPanDrag` with coordinate and position — [RNMapsGoogleMapView.mm](https://github.com/react-native-maps/react-native-maps/blob/master/ios/AirGoogleMaps/RNMapsGoogleMapView.mm)
- **`@dev-event/react-native-maps-draw` (abandoned):**
  - Latest 2.0.1, npm last modified 2022-11-30.
  - The GitHub repo is now `dev-chief/react-native-maps-draw`: last push 2023-12-06, 54 stars, 9 open issues, labeled "Beta version", not archived.
  - It requires `react-native-gesture-handler` + `react-native-svg`. Props include `points`, `onChangePoints`, `onEndDraw`, `widthLine`, `colorLine`, `backgroundCanvas`, and `convertByPoint` (wraps `mapRef.coordinateForPoint`).
  - Open issues include "Unable to draw" (2023-02), "Bounding Box is always offset from where you've drawn" (2023-01), and "Expo SDK 47: Problems caused by react-native-SVG version conflict".
  - The unscoped `react-native-maps-draw` on npm is 0.0.1 (2022).
  - Sources: [GitHub repo](https://github.com/dev-chief/react-native-maps-draw); [npm](https://www.npmjs.com/package/@dev-event/react-native-maps-draw); [jsdelivr README mirror of fork](https://cdn.jsdelivr.net/npm/@ycryptx/react-native-maps-draw@0.1.1/README.md)
- **`expo-maps-polygon-editor` (vertex editor, not freehand):** a multi-polygon editor for react-native-maps (Apple and Google Maps) to select, create and modify areas. Last push 2026-03-28, 21 stars. It has a known Android limitation with dragging vertices under the New Architecture. It is a vertex editor, not freehand tracing — [GitHub siposdani87/expo-maps-polygon-editor](https://github.com/siposdani87/expo-maps-polygon-editor)
- **Expo + react-native-maps:** "No additional setup is required when testing your project using Expo Go." To ship Google Maps to the stores you add an API key through the `react-native-maps` config plugin in app config, built with a dev build or EAS — [Expo docs: react-native-maps](https://docs.expo.dev/versions/latest/sdk/map-view/)
- **Expo's own `expo-maps` (v58.0.11, npm modified 2026-10-28):**
  - Google Maps on Android only. On iOS it uses Apple Maps and needs iOS 17+.
  - Google props include `scrollGesturesEnabled`, `polygons`, `onMapClick({coordinates})`, `onMapLongClick` and `onCameraMove`.
  - A grep of the Google types file found no screen-to-coordinate projection method.
  - Sources: [Expo docs: expo-maps](https://docs.expo.dev/versions/latest/sdk/maps/); [GoogleMaps.types.ts](https://github.com/expo/expo/blob/main/packages/expo-maps/src/google/GoogleMaps.types.ts)

### Inferences
- **Simplest RN path (Google on both platforms, `provider={PROVIDER_GOOGLE}`):**
  - Toggle `scrollEnabled={!drawing}` (plus `zoomEnabled`/`rotateEnabled`/`pitchEnabled`).
  - Collect `e.nativeEvent.coordinate` in `onPanDrag` into a ref, not state on every event.
  - Throttle re-rendering a `<Polyline>`, then render `<Polygon>` on finish.
  - `onPanDrag` has no explicit "drag end" event, so detect the end with a wrapping `onTouchEnd`/`onResponderRelease` or an RNGH gesture.
- **Overlay alternative:** an `Animated`/Reanimated SVG path drawn in screen space, with points converted at the end via `Promise.all(points.map(p => mapRef.current.coordinateForPoint(p)))`. Simplify or decimate in screen space first, so that tens rather than hundreds of bridge round-trips are made.
- **RN point-in-polygon:** react-native-maps has no geometry utils. Use a JS library such as `@turf/boolean-point-in-polygon`, or a ~15-line ray-casting function. Neither was verified this session.
- **Expo choice:** `expo-maps` would not satisfy "Google Maps on iOS", and no projection API was found in its types. react-native-maps is the practical Expo choice for this feature.

### Gaps
- No RN library dedicated to freehand drawing that is maintained as of 2026 was found.
- Whether `onPanDrag` fires reliably with `scrollEnabled={false}` on the iOS Google provider under the New Architecture was not confirmed via issues. The official example relies on it, but device testing is advised.
- The RN coordinate units passed to `coordinateForPoint` (dp/pt vs px on Android) were not verified in the source.

---

## Flutter: google_maps_flutter

### Takeaway
It is feasible but has the sharpest edges:
- `GoogleMapController.getLatLng(ScreenCoordinate)` is async (one platform-channel round trip per point).
- `ScreenCoordinate` is integer-valued and in platform "screen pixels". The Android plugin passes it straight to `Projection.fromScreenLocation`, which uses physical pixels, so you multiply Flutter logical offsets by `devicePixelRatio`. iOS passes it to `coordinateForPoint`, which uses points, so you don't.

Disable `scrollGesturesEnabled` and stack a `GestureDetector`/`Listener` + `CustomPaint` over the `GoogleMap`. No well-maintained pub.dev package does freehand lasso on Google Maps.

### Cited Findings
- **Package version:** google_maps_flutter latest 2.19.0, published 2026-10-14 — [pub.dev API](https://pub.dev/packages/google_maps_flutter)
- **`getLatLng` docs:** "Returns [LatLng] corresponding to the [ScreenCoordinate] in the current map view... The screen location is specified in screen pixels (not display pixels) relative to the top left of the map, not top left of the whole screen." It returns `Future<LatLng>` — [controller.dart](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter/lib/src/controller.dart); [ScreenCoordinate class](https://pub.dev/documentation/google_maps_flutter_platform_interface/latest/google_maps_flutter_platform_interface/ScreenCoordinate-class.html)
- **Android implementation:** `getLatLng` calls `googleMap.getProjection().fromScreenLocation(Convert.pointFromPigeon(screenCoordinate))`, where `pointFromPigeon(PlatformPoint)` is `new Point((int) point.getX(), (int) point.getY())`, with no density scaling. By contrast, the camera `zoomBy` focus path uses `pointFromPigeon(point, density)`, which multiplies by density — [GoogleMapController.java](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter_android/android/src/main/java/io/flutter/plugins/googlemaps/GoogleMapController.java); [Convert.java](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter_android/android/src/main/java/io/flutter/plugins/googlemaps/Convert.java)
- **iOS implementation:** `CGPoint point = FGMGetCGPointForPigeonPoint(screenCoordinate); [self.controller.mapView.projection coordinateForPoint:point]` (points) — [FGMGoogleMapController.m](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter_ios/ios/google_maps_flutter_ios/Sources/google_maps_flutter_ios/FGMGoogleMapController.m)
- **Known platform discrepancy:** Flutter issue #41653, "[google_maps_flutter] getLatLng returns different results on iOS/Android".
  - Reporter and commenters: "the Android API uses physical screen pixels, and the iOS API uses Points"; the same applies to `getScreenCoordinate()`.
  - Closed in 2021 as not reproducible by triage, but a user wrote in July 2021 "This issue is still not fixed".
  - The current source (above) still shows the asymmetry.
  - Source: [flutter/flutter#41653](https://github.com/flutter/flutter/issues/41653)
- **Gesture flags:** the `GoogleMap` widget exposes `scrollGesturesEnabled`, `zoomGesturesEnabled`, `rotateGesturesEnabled`, `tiltGesturesEnabled` and `gestureRecognizers` (`Set<Factory<OneSequenceGestureRecognizer>>`) — [google_map.dart](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter/lib/src/google_map.dart)
- **Custom gestures on iOS devices:** wrapping `GoogleMap` in a `GestureDetector` with custom `onScaleUpdate`/`onScaleEnd` worked on Android and iOS simulators but misbehaved on real iOS devices (issue open, last updated 2024-11). This is a caution for gesture overlays on iOS platform views — [flutter/flutter#153469](https://github.com/flutter/flutter/issues/153469)
- **`google_maps_drawing_tools`:** 0.0.6, published 2025-04-29, "unverified uploader", ~11 likes, Android/iOS. It draws polygons, rectangles and circles "with intuitive gestures", supports vertex editing and GeoJSON import/export, and wraps the map as `DrawingMapWidget` + `DrawingController.startDrawing(DrawMode.polygon)`. The docs don't document a freehand mode (only a "Drawing Freehand" screenshot caption) and no point-in-polygon helper — [pub.dev google_maps_drawing_tools](https://pub.dev/packages/google_maps_drawing_tools)
- **`flutter_map_gesture_drawing`:** freehand loop drawing with `GestureDetector` pan start/update/end that disables map interactions while drawing. It targets the `flutter_map` package (Leaflet-style), not Google Maps, but the pattern is a useful reference — [pub.dev flutter_map_gesture_drawing](https://pub.dev/packages/flutter_map_gesture_drawing)

### Inferences
- **Recommended Flutter recipe:**
  - `Stack[GoogleMap(scrollGesturesEnabled: !drawing, zoomGesturesEnabled: !drawing, rotateGesturesEnabled: !drawing, tiltGesturesEnabled: !drawing), if (drawing) Listener/GestureDetector + CustomPaint]`.
  - Record `localPosition` offsets relative to the map's box and paint the live stroke with `CustomPainter`, so there are no platform calls during the drag.
  - On pan end, decimate or simplify in screen space.
  - Convert with `ScreenCoordinate(x: (dx * (Platform.isAndroid ? dpr : 1)).round(), y: ...)`, using `MediaQuery.devicePixelRatioOf(context)`, and `await Future.wait(points.map(controller.getLatLng))`.
  - Then set `polygons: {Polygon(points: latLngs)}` and run point-in-polygon in Dart (e.g. a ray-casting helper, or `maps_toolkit`'s PolygonUtil port; not verified this session).
- **Integer precision:** because `ScreenCoordinate` is integer-valued, iOS loses sub-point precision. This is irrelevant for a finger stroke.
- **Synchronous alternative to `getLatLng`:** read `getVisibleRegion()`/camera once and compute Web Mercator inverse projection in Dart. This is valid only when rotation and tilt are 0, so disable them in draw mode.

### Gaps
- No actively maintained, well-adopted pub.dev package was found that does freehand lasso specifically on `google_maps_flutter`.
- The web implementation (`google_maps_flutter_web`) unit semantics were not checked; that is out of scope.
- Whether Flutter's team considers the Android/iOS unit difference intended behavior (no open issue tracking it was found) is unresolved.

---

## Performance and precision gotchas (cross-platform)

### Takeaway
The robust design is to draw the live stroke in screen space on an overlay, then convert to lat/lng once when the finger lifts. This avoids per-point projection calls, which are async over a bridge or channel on RN/Flutter. Then decimate/simplify, close the ring, clean up self-intersections, and do point-in-polygon with the platform geometry utils (Android `PolyUtil`, iOS `GMSGeometryContainsLocation`) or in JS/Dart.

### Cited Findings
- **Convert once:** the production Android implementation converts screen points to lat/lng only at `onDragEnd`, not per move event — [Juhos, DevFest Venezia 2026](https://speakerdeck.com/stewemetal/paths-polygons-and-donuts-building-a-freehand-drawing-tool-for-maps-devfest-venezia-2026-edition)
- **Async conversion:** RN `coordinateForPoint` returns a Promise per point — [react-native-maps mapview.md](https://github.com/react-native-maps/react-native-maps/blob/master/docs/mapview.md). Flutter `getLatLng` returns `Future<LatLng>` per point via a platform channel — [controller.dart](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter/lib/src/controller.dart)
- **RN alternative:** RN's `onPanDrag` delivers native-computed coordinates per event — [mapview.md](https://github.com/react-native-maps/react-native-maps/blob/master/docs/mapview.md); [PolygonCreator.tsx](https://github.com/react-native-maps/react-native-maps/blob/master/example/src/examples/PolygonCreator.tsx)
- **Simplification:** Android has `PolyUtil.simplify` (Douglas-Peucker) — [PolyUtil docs](https://googlemaps.github.io/android-maps-utils/library/com.google.maps.android/-poly-util/index.html). iOS GMS documents no simplify function — [GMS Functions](https://developers.google.com/maps/documentation/ios-sdk/reference/objc/Functions)
- **Closing the shape:** `PolyUtil.containsLocation` and `GMSGeometryContainsLocation` always treat the path as closed, so you don't have to append the first point for the containment test — [PolyUtil docs](https://googlemaps.github.io/android-maps-utils/library/com.google.maps.android/-poly-util/index.html); [GMS Functions](https://developers.google.com/maps/documentation/ios-sdk/reference/objc/Functions)
- **Self-intersection:** a stroke that crosses itself makes different inside-tests disagree. The fix is a self-UNION via `Path.op`, then EVEN_ODD fill for holes — [Juhos, DevFest Venezia 2026](https://speakerdeck.com/stewemetal/paths-polygons-and-donuts-building-a-freehand-drawing-tool-for-maps-devfest-venezia-2026-edition)
- **Float precision:** single-precision floats keep ~7 digits, enough to misclassify points near the edge when raw lat/lng goes through float-based graphics APIs. Normalize to a local range first — [Juhos, DevFest Venezia 2026](https://speakerdeck.com/stewemetal/paths-polygons-and-donuts-building-a-freehand-drawing-tool-for-maps-devfest-venezia-2026-edition)
- **High-DPI units:** Android Maps projection uses physical pixels; iOS uses points. This matters for Flutter and any cross-platform bridge — [flutter/flutter#41653](https://github.com/flutter/flutter/issues/41653); [Convert.java](https://github.com/flutter/packages/blob/main/packages/google_maps_flutter/google_maps_flutter_android/android/src/main/java/io/flutter/plugins/googlemaps/Convert.java)
- **Rhumb vs geodesic:** the `geodesic` flag selects great-circle (true) vs rhumb (false) segments in both PolyUtil and GMSGeometryContainsLocation — [PolyUtil docs](https://googlemaps.github.io/android-maps-utils/library/com.google.maps.android/-poly-util/index.html); [GMS Functions](https://developers.google.com/maps/documentation/ios-sdk/reference/objc/Functions)

### Inferences
- **Point budget:** a 1–2 s finger stroke at 60–120 Hz touch sampling yields roughly 100–250 raw points. Sample with a minimum screen distance (e.g. ≥ 4–8 px/pt) during capture, then Douglas-Peucker to tens of vertices. This keeps Polygon rendering, bridge round-trips, and backend query payloads (e.g. a polygon sent to a geo-query or Places-style search) small. The numbers are engineering estimates, not sourced.
- **Closing the ring:** Polygon renderers on both Google SDKs close the ring visually. If the backend expects GeoJSON/WKT, append the first vertex as the last (GeoJSON requires closed linear rings). If start and end are far apart, either auto-close with a straight segment (what most lasso UIs do) or reject strokes whose closing gap is too large or whose area is too small.
- **Self-intersection without a geometry library:** use even-odd ray-casting for "inside", which gives predictable figure-8 behavior. Or reject or repair self-intersecting shapes before sending them server-side, since many spatial backends reject invalid polygons.
- **Lock the camera:** keep the camera fixed during the stroke (disable scroll, zoom, rotate and tilt). The projection snapshot taken at conversion time must match what the user saw.
- **Client vs server filtering:** for a property-search app, client-side point-in-polygon is fine for filtering already-loaded pins (hundreds to low thousands). For "results only inside the shape" over a full catalog, send the simplified polygon (or its bounding box plus a client-side post-filter) to the backend. Clustered counts can then be computed on the filtered set, e.g. android-maps-utils clustering or google-maps-ios-utils `GMUClusterManager` (not verified this session; clustering is out of scope).

### Gaps
- No benchmark data was found on per-call latency of `coordinateForPoint` (RN) or `getLatLng` (Flutter) for batches of 100+ points.
- How `PolyUtil.containsLocation` and `GMSGeometryContainsLocation` behave on self-intersecting input is not documented on the pages fetched. Treat it as undefined and normalize the shape first.
