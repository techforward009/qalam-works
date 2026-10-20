import { TOOL_GROUPS, toolsInGroup } from "./toolCatalog";
import type { FeedbackTool } from "./feedback";

const legacyIds: Record<string, FeedbackTool> = {
  today: "today",
  all_tools: "other",
  book_layout: "document-studio",
  quality_audit: "publication-quality-checker",
  quran_reader: "quran-editions",
  date_finder: "date-converter",
  gregorian_calendar: "gregorian-calendar",
  hijri_calendar: "hijri-calendar",
};
const feedbackId = (id: string, route: string): FeedbackTool =>
  legacyIds[id] ?? route.split("/").at(-1) as FeedbackTool;

// Deduplicate Find a Date and Date Converter, which share a feedback category.
export const PUBLIC_FEEDBACK_GROUPS = TOOL_GROUPS.map(group => ({
  name: group.name,
  tools: toolsInGroup(group).filter(tool => tool.id !== "all_tools")
    .map(tool => ({ id: feedbackId(tool.id, tool.route), name: tool.name }))
    .filter((tool, index, all) => all.findIndex(other => other.id === tool.id) === index),
}));
export const PUBLIC_FEEDBACK_TOOLS = PUBLIC_FEEDBACK_GROUPS.flatMap(group => group.tools);

export const FEEDBACK_OPTIONS = [
  ...PUBLIC_FEEDBACK_TOOLS,
  { id: "services", name: { en: "Services", ur: "خدمات" } },
  { id: "other", name: { en: "Other", ur: "دیگر سہولت" } },
] satisfies { id: FeedbackTool; name: { en: string; ur: string } }[];
