import { isInsidePakistanBoundary, PAKISTAN_BOUNDS, PAKISTAN_BOUNDARY_VERSION } from "./pakistanBoundary";

export const PAKISTAN_MAP_GRID_VERSION = "pakistan-grid-0.75deg-v1";
export const PAKISTAN_MAP_GRID_SPACING_DEG = 0.75;

export type PakistanGridPoint = { id: string; latitudeDeg: number; longitudeDeg: number };

const round = (value: number) => Number(value.toFixed(6));

/** Deterministic point-centre grid; no interpolation or random sampling. */
export function createPakistanMapGrid(spacingDeg = PAKISTAN_MAP_GRID_SPACING_DEG): PakistanGridPoint[] {
  const points: PakistanGridPoint[] = [];
  const startLatitude = Math.ceil(PAKISTAN_BOUNDS.minLatitude / spacingDeg) * spacingDeg;
  const startLongitude = Math.ceil(PAKISTAN_BOUNDS.minLongitude / spacingDeg) * spacingDeg;
  for (let latitude = startLatitude; latitude <= PAKISTAN_BOUNDS.maxLatitude + 1e-9; latitude += spacingDeg) {
    for (let longitude = startLongitude; longitude <= PAKISTAN_BOUNDS.maxLongitude + 1e-9; longitude += spacingDeg) {
      const latitudeDeg = round(latitude), longitudeDeg = round(longitude);
      if (!isInsidePakistanBoundary(latitudeDeg, longitudeDeg)) continue;
      points.push({ id: `${PAKISTAN_MAP_GRID_VERSION}:${latitudeDeg.toFixed(3)}:${longitudeDeg.toFixed(3)}`, latitudeDeg, longitudeDeg });
    }
  }
  return points;
}

export function mapGridCacheKey(method: "yallop" | "pakistan-5year", date: { year: number; month: number; day: number }): string {
  return `${method}:${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}:${PAKISTAN_MAP_GRID_VERSION}:${PAKISTAN_BOUNDARY_VERSION}`;
}
