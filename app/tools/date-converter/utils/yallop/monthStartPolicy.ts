import type { MonthStartPolicy } from "./types";

export const QALAM_YALLOP_NAKED_EYE_AB_V1: MonthStartPolicy = {
  id: "yallop-naked-eye-ab-v1",
  name: "Qalam A/B naked-eye month-start policy v1",
  acceptedClasses: ["A", "B"],
  accepts: result => result.visibilityClass === "A" || result.visibilityClass === "B",
};
