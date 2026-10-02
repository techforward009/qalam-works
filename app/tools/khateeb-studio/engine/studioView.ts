import { KHATEEB_CORPUS } from "./khateebCorpus";
import { groupCalendarEvents } from "./groupCalendarEvents";
import {
  CALENDAR_MONTHS_1448,
  SHIA_CALENDAR_1448_EVENTS,
  type IslamicMonthId,
  type ShiaCalendarRegion,
} from "./shiaCalendar";
import type { SermonDuration } from "./sermonPrep";
import type { MajlisSeriesLength } from "./seriesPlanner";
import { TOPIC_PREPS } from "./topicPrep";

export type KhateebPreparationMode = "topic" | "occasion";
export type KhateebWorkflowStep = 1 | 2 | 3;

export type KhateebStudioView = {
  step: KhateebWorkflowStep;
  mode: KhateebPreparationMode;
  topic: string;
  speaker: string;
  month: IslamicMonthId;
  region: ShiaCalendarRegion;
  event: string;
  duration: SermonDuration;
  series: MajlisSeriesLength;
};

export const DEFAULT_KHATEEB_STUDIO_VIEW: KhateebStudioView = {
  step: 1,
  mode: "topic",
  topic: "sabr",
  speaker: "",
  month: "rabi-al-thani",
  region: "all",
  event: "",
  duration: 30,
  series: 1,
};

const MONTHS = new Set(CALENDAR_MONTHS_1448.map((item) => item.id));
const TOPICS = new Set(TOPIC_PREPS.map((item) => item.id));
const SPEAKERS = new Set(KHATEEB_CORPUS.map((item) => item.id));
const REGIONS = new Set<ShiaCalendarRegion>(["all", "pk", "in", "ir"]);
const DURATIONS = new Set<SermonDuration>([20, 30, 45]);
const SERIES_LENGTHS = new Set<MajlisSeriesLength>([1, 3, 5, 10]);

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function visibleEvent(month: IslamicMonthId, region: ShiaCalendarRegion, event: string): string {
  if (!event) return "";
  const events = SHIA_CALENDAR_1448_EVENTS.filter((item) => {
    if (item.month !== month) return false;
    if (region === "all") return true;
    if (!item.regions?.length) return true;
    return item.regions.includes("all") || item.regions.includes(region);
  });
  return groupCalendarEvents(events).some((group) => group.key === event) ? event : "";
}

export function parseKhateebStudioView(
  raw: Partial<Record<string, string | string[] | undefined>> = {},
): KhateebStudioView {
  const stepNumber = Number(first(raw.step));
  const step: KhateebWorkflowStep = stepNumber === 2 || stepNumber === 3 ? stepNumber : 1;
  const mode: KhateebPreparationMode = first(raw.mode) === "occasion" ? "occasion" : "topic";
  const topicValue = first(raw.topic);
  const speakerValue = first(raw.speaker);
  const monthValue = first(raw.month);
  const regionValue = first(raw.region);
  const durationValue = Number(first(raw.duration));
  const seriesValue = Number(first(raw.series));
  const month = MONTHS.has(monthValue as IslamicMonthId)
    ? (monthValue as IslamicMonthId)
    : DEFAULT_KHATEEB_STUDIO_VIEW.month;
  const region = REGIONS.has(regionValue as ShiaCalendarRegion)
    ? (regionValue as ShiaCalendarRegion)
    : "all";

  return {
    step,
    mode,
    topic: TOPICS.has(topicValue) ? topicValue : DEFAULT_KHATEEB_STUDIO_VIEW.topic,
    speaker: SPEAKERS.has(speakerValue) ? speakerValue : "",
    month,
    region,
    event: visibleEvent(month, region, first(raw.event)),
    duration: DURATIONS.has(durationValue as SermonDuration)
      ? (durationValue as SermonDuration)
      : 30,
    series: SERIES_LENGTHS.has(seriesValue as MajlisSeriesLength)
      ? (seriesValue as MajlisSeriesLength)
      : 1,
  };
}

export function khateebStudioQuery(view: KhateebStudioView): string {
  const params = new URLSearchParams();
  if (view.step !== DEFAULT_KHATEEB_STUDIO_VIEW.step) params.set("step", String(view.step));
  if (view.mode !== DEFAULT_KHATEEB_STUDIO_VIEW.mode) params.set("mode", view.mode);
  if (view.topic !== DEFAULT_KHATEEB_STUDIO_VIEW.topic) params.set("topic", view.topic);
  if (view.speaker) params.set("speaker", view.speaker);
  if (view.month !== DEFAULT_KHATEEB_STUDIO_VIEW.month) params.set("month", view.month);
  if (view.region !== DEFAULT_KHATEEB_STUDIO_VIEW.region) params.set("region", view.region);
  if (view.event) params.set("event", view.event);
  if (view.duration !== DEFAULT_KHATEEB_STUDIO_VIEW.duration) params.set("duration", String(view.duration));
  if (view.series !== DEFAULT_KHATEEB_STUDIO_VIEW.series) params.set("series", String(view.series));
  return params.toString();
}

export function applyKhateebStudioQuery(current: string, view: KhateebStudioView): string {
  const params = new URLSearchParams(current.startsWith("?") ? current.slice(1) : current);
  for (const key of ["step", "mode", "topic", "speaker", "month", "region", "event", "duration", "series"]) {
    params.delete(key);
  }
  const next = new URLSearchParams(khateebStudioQuery(view));
  for (const [key, value] of next) params.set(key, value);
  return params.toString();
}
