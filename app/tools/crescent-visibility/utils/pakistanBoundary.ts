import boundaryAsset from "../assets/pakistan-boundary.json";

export type MapCoordinate = readonly [number, number];

export const PAKISTAN_BOUNDARY_VERSION = "natural-earth-110m-pakistan-v1";
export const PAKISTAN_BOUNDARY_RING = boundaryAsset.geometry.coordinates[0] as unknown as readonly MapCoordinate[];

export const PAKISTAN_BOUNDS = PAKISTAN_BOUNDARY_RING.reduce((bounds, [longitude, latitude]) => ({
  minLongitude: Math.min(bounds.minLongitude, longitude), maxLongitude: Math.max(bounds.maxLongitude, longitude),
  minLatitude: Math.min(bounds.minLatitude, latitude), maxLatitude: Math.max(bounds.maxLatitude, latitude),
}), { minLongitude: Infinity, maxLongitude: -Infinity, minLatitude: Infinity, maxLatitude: -Infinity });

/** Ray-casting containment against the locally bundled Pakistan boundary polygon. */
export function isInsidePakistanBoundary(latitude: number, longitude: number): boolean {
  let inside = false;
  for (let i = 0, j = PAKISTAN_BOUNDARY_RING.length - 1; i < PAKISTAN_BOUNDARY_RING.length; j = i++) {
    const [xi, yi] = PAKISTAN_BOUNDARY_RING[i];
    const [xj, yj] = PAKISTAN_BOUNDARY_RING[j];
    const crosses = (yi > latitude) !== (yj > latitude)
      && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
