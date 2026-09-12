import { Body, EquatorFromVector, HelioVector, KM_PER_AU, Observer, RotateVector, Rotation_EQJ_EQD, SearchMoonPhase, SearchRiseSet, SiderealTime, Vector } from "astronomy-engine";
import { QALAM_YALLOP_NAKED_EYE_AB_V1 } from "./monthStartPolicy";
import { validateYallopObserver } from "./observerLocations";
import { buildYallopProvenance } from "./provenance";
import type { MonthStartPolicy, YallopAstronomyInput, YallopAstronomySnapshot, YallopEvaluation, YallopObserver } from "./types";
import { evaluateYallopCriterion } from "./yallopCriterion";

const EARTH_EQUATORIAL_RADIUS_KM = 6378.137;
const radians = (degrees: number) => degrees * Math.PI / 180;
const degrees = (radiansValue: number) => radiansValue * 180 / Math.PI;
const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));
const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360;
const signedAngle = (value: number) => ((value + 540) % 360) - 180;

export interface GeocentricHorizontalCoordinates { altitudeDeg: number; azimuthDeg: number }

/**
 * Converts geocentric equator-of-date RA/Dec to the observer's local horizon.
 * H = GAST + east-positive longitude - RA; no parallax or refraction is added.
 */
export function geocentricHorizontalFromRaDec(date: Date, observer: YallopObserver, raHours: number, decDeg: number): GeocentricHorizontalCoordinates {
  const latitude = radians(observer.latitudeDeg);
  const declination = radians(decDeg);
  const hourAngle = radians(signedAngle(SiderealTime(date) * 15 + observer.longitudeDeg - raHours * 15));
  const sinAltitude = Math.sin(latitude) * Math.sin(declination) + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const altitude = Math.asin(clampUnit(sinAltitude));
  const azimuth = Math.atan2(-Math.sin(hourAngle) * Math.cos(declination), Math.sin(declination) * Math.cos(latitude) - Math.cos(declination) * Math.sin(latitude) * Math.cos(hourAngle));
  return { altitudeDeg: degrees(altitude), azimuthDeg: normalizeDegrees(degrees(azimuth)) };
}

/** Same-epoch geometric geocentric vector: no aberration and no light-time. */
export function geometricGeocentricVector(body: Body.Sun | Body.Moon, date: Date): Vector {
  const target = HelioVector(body, date);
  const earth = HelioVector(Body.Earth, date);
  return new Vector(target.x - earth.x, target.y - earth.y, target.z - earth.z, target.t);
}

function geocentricPosition(body: Body.Sun | Body.Moon, date: Date, observer: YallopObserver) {
  const vectorJ2000 = geometricGeocentricVector(body, date);
  const vectorOfDate = RotateVector(Rotation_EQJ_EQD(date), vectorJ2000);
  const equatorial = EquatorFromVector(vectorOfDate);
  return { ...geocentricHorizontalFromRaDec(date, observer, equatorial.ra, equatorial.dec), raHours: equatorial.ra, decDeg: equatorial.dec, distanceAu: equatorial.dist };
}

export function calculateBestTimeUtc(sunsetUtc: string, moonsetUtc: string): string | null {
  const sunset = Date.parse(sunsetUtc), moonset = Date.parse(moonsetUtc);
  if (!Number.isFinite(sunset) || !Number.isFinite(moonset)) throw new Error("Best-time inputs must be valid UTC instants");
  if (moonset <= sunset) return null;
  return new Date(sunset + (4 / 9) * (moonset - sunset)).toISOString();
}

function separationDeg(a: { raHours: number; decDeg: number }, b: { raHours: number; decDeg: number }): number {
  const da = radians((a.raHours - b.raHours) * 15), d1 = radians(a.decDeg), d2 = radians(b.decDeg);
  return degrees(Math.acos(clampUnit(Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(da))));
}

export function evaluateYallopAstronomy(input: YallopAstronomyInput, policy: MonthStartPolicy = QALAM_YALLOP_NAKED_EYE_AB_V1): YallopEvaluation {
  validateYallopObserver(input.observer);
  if (Math.abs(input.observer.latitudeDeg) >= 66.5) return { status: "unsupported-latitude", observer: input.observer, detail: "Phase 1 supports observers between the polar circles" };
  const start = new Date(input.evaluationWindowStartUtc);
  if (!Number.isFinite(start.getTime())) return { status: "unsupported-date", observer: input.observer, detail: "Invalid UTC evaluation-window start" };
  const limitDays = input.searchLimitDays ?? 1;
  const observer = new Observer(input.observer.latitudeDeg, input.observer.longitudeDeg, input.observer.elevationMeters);
  const sunset = SearchRiseSet(Body.Sun, observer, -1, start, limitDays);
  if (!sunset) return { status: "no-sunset", observer: input.observer, detail: "No sunset in the evaluation window" };
  const moonset = SearchRiseSet(Body.Moon, observer, -1, sunset, Math.max(1, limitDays));
  if (!moonset) return { status: "no-moonset", observer: input.observer, detail: "No moonset after sunset in the search window" };
  const bestTimeUtc = calculateBestTimeUtc(sunset.date.toISOString(), moonset.date.toISOString());
  if (!bestTimeUtc) return { status: "moonset-before-or-at-sunset", observer: input.observer, detail: "Moonset is before or at sunset" };
  const conjunction = SearchMoonPhase(0, new Date(sunset.date.getTime() - 35 * 86400000), 36);
  if (!conjunction || conjunction.date > new Date(bestTimeUtc)) return { status: "conjunction-after-evaluation-window", observer: input.observer, detail: "No preceding conjunction was found before best time" };
  const time = new Date(bestTimeUtc), moon = geocentricPosition(Body.Moon, time, input.observer), sun = geocentricPosition(Body.Sun, time, input.observer);
  const snapshot: YallopAstronomySnapshot = {
    observer: input.observer, conjunctionUtc: conjunction.date.toISOString(), sunsetUtc: sunset.date.toISOString(), moonsetUtc: moonset.date.toISOString(), bestTimeUtc,
    arclDeg: separationDeg(moon, sun), arcvDeg: moon.altitudeDeg - sun.altitudeDeg,
    dazDeg: Math.abs(signedAngle(moon.azimuthDeg - sun.azimuthDeg)), moonGeocentricAltitudeDeg: moon.altitudeDeg,
    horizontalParallaxDeg: degrees(Math.asin(clampUnit(EARTH_EQUATORIAL_RADIUS_KM / (moon.distanceAu * KM_PER_AU)))),
  };
  const criterion = evaluateYallopCriterion({
    arclDeg: snapshot.arclDeg,
    arcvDeg: snapshot.arcvDeg,
    moonGeocentricAltitudeDeg: snapshot.moonGeocentricAltitudeDeg,
    horizontalParallaxDeg: snapshot.horizontalParallaxDeg,
  });
  return { status: "evaluated", snapshot, criterion, acceptedByPolicy: policy.accepts(criterion), provenance: buildYallopProvenance(snapshot, criterion, policy) };
}
