// Shared contract between the map engine and its drawing modes (crosshair, trace).
export interface ModeContext {
  host: HTMLElement;
  map: google.maps.Map;
  announce(text: string): void;
  /** Visible, assertive shape error ('' clears it). */
  showError(text: string): void;
  setMarkersVisible(visible: boolean): void;
  requestArea(query: string): void;
  focusMap(): void;
  /** Container-pixel → lat/lng through the map's current projection. */
  toLatLng(x: number, y: number): google.maps.LatLngLiteral;
  /** Override the map's gestureHandling ('none' while tracing); null restores the original. */
  setGestures(mode: 'none' | null): void;
  /** Ends any other active mode (modes are mutually exclusive). */
  stopOtherModes(except: Mode): void;
}

export interface Mode {
  readonly active: boolean;
  start(): void;
  /** Leave the mode without searching; restores the previous view. */
  cancel(opts?: { silent?: boolean }): void;
  action(name: string): boolean;
  onKeydown(event: KeyboardEvent): void;
}
