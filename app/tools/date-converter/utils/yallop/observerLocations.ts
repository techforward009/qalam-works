import type { YallopObserver } from "./types";

const TIMEZONE = "Asia/Karachi";

// City-centre coordinates are rounded to 0.01 degree from GeoNames. Phase 1
// uses a documented sea-level reference instead of inventing station heights.
export const PAKISTAN_YALLOP_OBSERVERS = [
  ["karachi", "Karachi", 24.86, 67.01],
  ["hyderabad", "Hyderabad", 25.38, 68.37],
  ["lahore", "Lahore", 31.56, 74.35],
  ["rawalpindi", "Rawalpindi", 33.60, 73.05],
  ["multan", "Multan", 30.20, 71.48],
  ["islamabad", "Islamabad", 33.72, 73.04],
  ["peshawar", "Peshawar", 34.01, 71.58],
  ["quetta", "Quetta", 30.18, 67.00],
  ["muzaffarabad", "Muzaffarabad", 34.37, 73.47],
  ["gilgit", "Gilgit", 35.92, 74.31],
  ["skardu", "Skardu", 35.30, 75.63],
].map(([id, name, latitudeDeg, longitudeDeg]) => ({
  id, name, latitudeDeg, longitudeDeg, elevationMeters: 0, timezone: TIMEZONE,
})) as YallopObserver[];

export function validateYallopObserver(observer: YallopObserver): void {
  if (!Number.isFinite(observer.latitudeDeg) || observer.latitudeDeg < -90 || observer.latitudeDeg > 90) throw new Error("Observer latitude must be within -90..90 degrees");
  if (!Number.isFinite(observer.longitudeDeg) || observer.longitudeDeg < -180 || observer.longitudeDeg > 180) throw new Error("Observer longitude must be within -180..180 degrees");
  if (!Number.isFinite(observer.elevationMeters)) throw new Error("Observer elevation must be finite");
  try { new Intl.DateTimeFormat("en", { timeZone: observer.timezone }).format(0); }
  catch { throw new Error(`Observer timezone is not a valid IANA identifier: ${observer.timezone}`); }
}

export function yallopObserver(id: string): YallopObserver | undefined {
  return PAKISTAN_YALLOP_OBSERVERS.find(observer => observer.id === id);
}
