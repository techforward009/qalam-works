import { Body, Equator, Horizon, Illumination, KM_PER_AU, Observer, SearchRiseSet } from "astronomy-engine";
import type { DateParts } from "../dateEngine";
import { observerLocalMidnightUtc } from "../yallop/dateStudioPrediction";
import type { YallopObserver } from "../yallop/types";
import { geocentricPosition } from "../yallop/astronomyAdapter";
import { calculateCrescentWidth } from "../astronomy/crescentWidth";
import { evaluatePakistanFiveYearCriterion } from "./criterion";
import type { PakistanCrescentPrediction } from "./types";

const EARTH_EQUATORIAL_RADIUS_KM = 6378.137;
const degrees = (rad: number) => rad * 180 / Math.PI;
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

export function phaseFractionToPercent(value: number): number {
  return value * 100;
}

function separationDeg(a: { raHours: number; decDeg: number }, b: { raHours: number; decDeg: number }) {
  const delta = (a.raHours - b.raHours) * 15 * Math.PI / 180, ad = a.decDeg * Math.PI / 180, bd = b.decDeg * Math.PI / 180;
  return degrees(Math.acos(clamp(Math.sin(ad) * Math.sin(bd) + Math.cos(ad) * Math.cos(bd) * Math.cos(delta))));
}

/** Evaluates the published Pakistan five-year criterion at the selected observer's local sunset. */
export function evaluateDateStudioPakistanCrescentPrediction(gregorian: DateParts, observer: YallopObserver): PakistanCrescentPrediction {
  const observerLocalDate = `${String(gregorian.year).padStart(4, "0")}-${String(gregorian.month).padStart(2, "0")}-${String(gregorian.day).padStart(2, "0")}`;
  const evaluationWindowStartUtc = observerLocalMidnightUtc(gregorian, observer.timezone);
  const location = new Observer(observer.latitudeDeg, observer.longitudeDeg, observer.elevationMeters);
  const sunset = SearchRiseSet(Body.Sun, location, -1, new Date(evaluationWindowStartUtc), 1);
  if (!sunset) return { status: "no-sunset", observerLocalDate, evaluationWindowStartUtc, observer };
  const moonset = SearchRiseSet(Body.Moon, location, -1, sunset, 1);
  if (!moonset) return { status: "no-moonset", observerLocalDate, evaluationWindowStartUtc, observer };
  if (moonset.date <= sunset.date) return { status: "moonset-before-or-at-sunset", observerLocalDate, evaluationWindowStartUtc, observer };
  const time = sunset.date;
  const topocentricMoon = Equator(Body.Moon, time, location, true, true);
  // Conservative Qalam convention: geometric topocentric altitude, with no refraction.
  const altitudeDeg = Horizon(time, location, topocentricMoon.ra, topocentricMoon.dec).altitude;
  const moon = geocentricPosition(Body.Moon, time, observer);
  const sun = geocentricPosition(Body.Sun, time, observer);
  const elongationDeg = separationDeg(moon, sun);
  const horizontalParallaxDeg = degrees(Math.asin(clamp(EARTH_EQUATORIAL_RADIUS_KM / (moon.distanceAu * KM_PER_AU))));
  const { widthArcMin } = calculateCrescentWidth({ arclDeg: elongationDeg, moonGeocentricAltitudeDeg: moon.altitudeDeg, horizontalParallaxDeg });
  const snapshot = { observer, sunsetUtc: time.toISOString(), moonsetUtc: moonset.date.toISOString(), altitudeDeg, widthArcMin, illuminationPercent: phaseFractionToPercent(Illumination(Body.Moon, time).phase_fraction), elongationDeg, lagMinutes: (moonset.date.getTime() - time.getTime()) / 60_000 };
  return { status: "evaluated", observerLocalDate, evaluationWindowStartUtc, snapshot, criterion: evaluatePakistanFiveYearCriterion(snapshot), provenance: { method: "Pakistan 5-Year Calendar Criterion", criterionId: "pakistan-5year-lunar-calendar", criterionVersion: "published", astronomyProvider: "Astronomy Engine", sourceUrl: "https://pakmoonsighting.pk/Introduction.aspx", sourceType: "astronomical-prediction", altitudeConvention: "topocentric geometric altitude; atmospheric refraction not applied", crescentWidthConvention: "existing Qalam validated crescent-width primitive evaluated at sunset", evaluationInstant: "local sunset", illuminationConvention: "Astronomy Engine phase fraction converted to percent" } };
}
