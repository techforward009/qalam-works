export const BORDER_PATTERN_IDS = [
  "none",
  "solid",
  "dashed",
  "dotted",
  "dash-dot",
  "dash-dot-dot",
  "double",
  "thick-thin",
  "thin-thick",
] as const;

export type BorderPatternId = (typeof BORDER_PATTERN_IDS)[number];

export type BorderPatternOption = {
  id: BorderPatternId;
  label: string;
};

export const BORDER_PATTERN_OPTIONS: ReadonlyArray<BorderPatternOption> = [
  { id: "none", label: "None" },
  { id: "solid", label: "Solid" },
  { id: "dashed", label: "Dashed" },
  { id: "dotted", label: "Dotted" },
  { id: "dash-dot", label: "Dash Dot" },
  { id: "dash-dot-dot", label: "Dash Dot Dot" },
  { id: "double", label: "Double" },
  { id: "thick-thin", label: "Thick-Thin" },
  { id: "thin-thick", label: "Thin-Thick" },
];

const BORDER_PATTERN_SET = new Set<string>(BORDER_PATTERN_IDS);

export function isValidBorderPattern(value: unknown): value is BorderPatternId {
  return typeof value === "string" && BORDER_PATTERN_SET.has(value);
}

export function borderPatternLabel(pattern: BorderPatternId | undefined): string {
  const target = pattern ?? "none";
  return BORDER_PATTERN_OPTIONS.find((option) => option.id === target)?.label ?? "None";
}

export type BorderStrokePart = {
  /** Offset along inward normal (positive = smaller inset box, negative = outward). */
  insetDelta: number;
  strokeWidth: number;
  dashArray?: string;
};

export function resolveBorderStrokes(pattern: BorderPatternId | undefined, totalWidth: number): BorderStrokePart[] {
  const effective = pattern ?? "solid";
  if (effective === "none" || !Number.isFinite(totalWidth) || totalWidth <= 0) return [];
  const fmt = (n: number) => Number(n.toFixed(4));
  switch (effective) {
    case "solid":
      return [{ insetDelta: 0, strokeWidth: totalWidth }];
    case "dashed":
      return [{ insetDelta: 0, strokeWidth: totalWidth, dashArray: `${fmt(3 * totalWidth)} ${fmt(1.5 * totalWidth)}` }];
    case "dotted":
      return [{ insetDelta: 0, strokeWidth: totalWidth, dashArray: `${fmt(totalWidth)} ${fmt(totalWidth)}` }];
    case "dash-dot":
      return [{
        insetDelta: 0,
        strokeWidth: totalWidth,
        dashArray: `${fmt(4 * totalWidth)} ${fmt(1.5 * totalWidth)} ${fmt(totalWidth)} ${fmt(1.5 * totalWidth)}`,
      }];
    case "dash-dot-dot":
      return [{
        insetDelta: 0,
        strokeWidth: totalWidth,
        dashArray: `${fmt(4 * totalWidth)} ${fmt(1.5 * totalWidth)} ${fmt(totalWidth)} ${fmt(1.5 * totalWidth)} ${fmt(totalWidth)} ${fmt(1.5 * totalWidth)}`,
      }];
    case "double": {
      const partWidth = totalWidth / 3;
      return [
        { insetDelta: -totalWidth / 3, strokeWidth: partWidth },
        { insetDelta: totalWidth / 3, strokeWidth: partWidth },
      ];
    }
    case "thick-thin":
      return [
        { insetDelta: -0.25 * totalWidth, strokeWidth: 0.5 * totalWidth },
        { insetDelta: 0.375 * totalWidth, strokeWidth: 0.25 * totalWidth },
      ];
    case "thin-thick":
      return [
        { insetDelta: -0.375 * totalWidth, strokeWidth: 0.25 * totalWidth },
        { insetDelta: 0.25 * totalWidth, strokeWidth: 0.5 * totalWidth },
      ];
  }
}

export function cssBorderStyleForPattern(pattern: BorderPatternId | undefined): "none" | "solid" | "dashed" | "dotted" | "double" {
  switch (pattern ?? "solid") {
    case "none":
      return "none";
    case "solid":
      return "solid";
    case "dashed":
    case "dash-dot":
    case "dash-dot-dot":
      return "dashed";
    case "dotted":
      return "dotted";
    case "double":
    case "thick-thin":
    case "thin-thick":
      return "double";
  }
}
