import { validateYallopObserver } from "../yallop/observerLocations";
import type { YallopObserver } from "../yallop/types";

/**
 * Creates a synthetic observer for a Pakistan-wide map grid. Grid results use a
 * 0 m reference elevation: they are geographic reference samples, not
 * terrain-specific forecasts or named observing stations.
 */
export function createPakistanGridObserver(latitudeDeg: number, longitudeDeg: number, id: string): YallopObserver {
  const observer: YallopObserver = {
    id,
    name: `Grid point ${latitudeDeg.toFixed(3)}, ${longitudeDeg.toFixed(3)}`,
    latitudeDeg,
    longitudeDeg,
    elevationMeters: 0,
    timezone: "Asia/Karachi",
  };
  validateYallopObserver(observer);
  return observer;
}
