import { expect, it } from "vitest";
import { FEEDBACK_OPTIONS, PUBLIC_FEEDBACK_TOOLS } from "../app/lib/feedbackCatalog";
import { FEEDBACK_TOOLS, parseFeedback } from "../app/lib/feedback";
import { TOOL_GROUPS, toolsInGroup } from "../app/lib/toolCatalog";

it("uses catalog names and order, excludes Research Studio and puts Khateeb last", () => {
  const catalog = TOOL_GROUPS.flatMap(toolsInGroup).filter(tool => tool.id !== "date_finder");
  expect(PUBLIC_FEEDBACK_TOOLS.map(tool => tool.name)).toEqual(catalog.map(tool => tool.name));
  expect(FEEDBACK_OPTIONS.some(tool => String(tool.id) === "research-studio")).toBe(false);
  expect(FEEDBACK_OPTIONS.at(-1)?.id).toBe("khateeb-studio");
  for (const id of ["calendar-maker", "urdu-text-to-pdf", "roman-urdu-to-urdu", "hijri-to-gregorian"]) {
    expect(FEEDBACK_OPTIONS.some(tool => tool.id === id)).toBe(true);
  }
});

it("accepts feedback for every visible category without changing the legacy IDs", () => {
  for (const { id } of FEEDBACK_OPTIONS) {
    expect(FEEDBACK_TOOLS).toContain(id);
    expect(parseFeedback({ tool: id, rating: "helpful", comment: "Useful", page: "/feedback" })).toMatchObject({ tool: id });
  }
  expect(FEEDBACK_OPTIONS.some(tool => tool.id === "publication-quality-checker")).toBe(true);
  expect(FEEDBACK_OPTIONS.some(tool => tool.id === "quran-editions")).toBe(true);
});
