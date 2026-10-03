import type { MajlisSeriesSession } from "./seriesPlanner";

export type KhateebDeliveryRecord = {
  id: string;
  deliveredAt: string;
  topicId: string;
  topicTitleUr: string;
  topicTitleEn: string;
  seriesLength: number;
  layer: "fresh" | "research";
  sessionNumber: number;
  sessionTitleUr: string;
  sessionTitleEn: string;
  purposeUr: string;
  takeawayUr?: string;
  materialUr: readonly string[];
  sourceUr: string;
  personalNote?: string;
  occasionId?: string;
  occasionTitleUr?: string;
  occasionMonth?: string;
  occasionDay?: number;
};

export const KHATEEB_DELIVERY_PREFIX = "qalam-khateeb-delivery-v1";

function slugPart(value: string): string {
  return value.replace(/[:\s]+/g, "-").replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, "").slice(0, 80);
}

export function deliveryRecordKey(record: Pick<
  KhateebDeliveryRecord,
  "deliveredAt" | "topicId" | "seriesLength" | "layer" | "sessionNumber"
>): string {
  return [
    KHATEEB_DELIVERY_PREFIX,
    record.deliveredAt,
    slugPart(record.topicId),
    record.seriesLength,
    record.layer,
    record.sessionNumber,
  ].join(":");
}

export function serializeDeliveryRecord(record: KhateebDeliveryRecord): string {
  return JSON.stringify(record);
}

export function parseDeliveryRecord(raw: string | null): KhateebDeliveryRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<KhateebDeliveryRecord>;
    if (
      typeof value.id !== "string" ||
      typeof value.deliveredAt !== "string" ||
      typeof value.topicId !== "string" ||
      typeof value.sessionNumber !== "number" ||
      typeof value.sessionTitleUr !== "string"
    ) return null;
    return {
      id: value.id,
      deliveredAt: value.deliveredAt,
      topicId: value.topicId,
      topicTitleUr: value.topicTitleUr ?? value.topicId,
      topicTitleEn: value.topicTitleEn ?? value.topicId,
      seriesLength: typeof value.seriesLength === "number" ? value.seriesLength : 1,
      layer: value.layer === "research" ? "research" : "fresh",
      sessionNumber: value.sessionNumber,
      sessionTitleUr: value.sessionTitleUr,
      sessionTitleEn: value.sessionTitleEn ?? value.sessionTitleUr,
      purposeUr: value.purposeUr ?? "",
      takeawayUr: value.takeawayUr,
      materialUr: Array.isArray(value.materialUr) ? value.materialUr.filter((item): item is string => typeof item === "string") : [],
      sourceUr: value.sourceUr ?? "",
      personalNote: value.personalNote,
      occasionId: value.occasionId,
      occasionTitleUr: value.occasionTitleUr,
      occasionMonth: value.occasionMonth,
      occasionDay: value.occasionDay,
    };
  } catch {
    return null;
  }
}

export function buildDeliveryRecord(args: {
  now?: string;
  topicId: string;
  topicTitleUr: string;
  topicTitleEn: string;
  seriesLength: number;
  layer: "fresh" | "research";
  session: MajlisSeriesSession;
  personalNote?: string;
  occasion?: {
    id: string;
    titleUr: string;
    month?: string;
    day?: number;
  };
}): KhateebDeliveryRecord {
  const deliveredAt = args.now ?? new Date().toISOString();
  return {
    id: `${args.topicId}-${args.seriesLength}-${args.layer}-${args.session.number}-${deliveredAt}`,
    deliveredAt,
    topicId: args.topicId,
    topicTitleUr: args.topicTitleUr,
    topicTitleEn: args.topicTitleEn,
    seriesLength: args.seriesLength,
    layer: args.layer,
    sessionNumber: args.session.number,
    sessionTitleUr: args.session.titleUr,
    sessionTitleEn: args.session.titleEn,
    purposeUr: args.session.purposeUr,
    takeawayUr: args.session.takeawayUr,
    materialUr: args.session.materialUr,
    sourceUr: args.session.sourceUr,
    personalNote: args.personalNote?.trim() || undefined,
    occasionId: args.occasion?.id,
    occasionTitleUr: args.occasion?.titleUr,
    occasionMonth: args.occasion?.month,
    occasionDay: args.occasion?.day,
  };
}

export function matchingPastDeliveries(
  records: readonly KhateebDeliveryRecord[],
  args: { topicId: string; sessionNumber?: number; occasionId?: string },
): KhateebDeliveryRecord[] {
  return records
    .filter((record) => {
      if (args.occasionId && record.occasionId === args.occasionId) return true;
      if (record.topicId !== args.topicId) return false;
      if (typeof args.sessionNumber === "number" && record.sessionNumber !== args.sessionNumber) return false;
      return true;
    })
    .sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt));
}

export function repetitionFingerprint(record: KhateebDeliveryRecord): string[] {
  return [
    record.sessionTitleUr,
    record.purposeUr,
    ...record.materialUr,
    record.takeawayUr ?? "",
  ].filter(Boolean);
}
