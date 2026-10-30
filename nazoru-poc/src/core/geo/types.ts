export interface LatLng {
  lat: number;
  lng: number;
}

export const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
