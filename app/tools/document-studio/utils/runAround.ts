/** InPage Offset defaults for a fresh box. Missing fields on old files mean these values. */
export const DEFAULT_RUN_AROUND = false;
export const DEFAULT_RUN_AROUND_LEFT_MM = 0.71;
export const DEFAULT_RUN_AROUND_RIGHT_MM = 0.71;
export const DEFAULT_RUN_AROUND_TOP_MM = 0.35;
export const DEFAULT_RUN_AROUND_BOTTOM_MM = 0.35;
const CLEARANCE_MAX_MM = 2000;

export type RunAroundFields = {
  runAround?: boolean;
  runAroundLeftMm?: number;
  runAroundRightMm?: number;
  runAroundTopMm?: number;
  runAroundBottomMm?: number;
};

export function resolvedRunAround(frame: RunAroundFields): boolean {
  return frame.runAround ?? DEFAULT_RUN_AROUND;
}

export function resolvedRunAroundClearance(frame: RunAroundFields): { leftMm: number; rightMm: number; topMm: number; bottomMm: number } {
  return {
    leftMm: frame.runAroundLeftMm ?? DEFAULT_RUN_AROUND_LEFT_MM,
    rightMm: frame.runAroundRightMm ?? DEFAULT_RUN_AROUND_RIGHT_MM,
    topMm: frame.runAroundTopMm ?? DEFAULT_RUN_AROUND_TOP_MM,
    bottomMm: frame.runAroundBottomMm ?? DEFAULT_RUN_AROUND_BOTTOM_MM,
  };
}

export function validRunAroundFields(frame: {
  runAround?: unknown;
  runAroundLeftMm?: unknown;
  runAroundRightMm?: unknown;
  runAroundTopMm?: unknown;
  runAroundBottomMm?: unknown;
}): boolean {
  if (frame.runAround !== undefined && typeof frame.runAround !== "boolean") return false;
  for (const key of ["runAroundLeftMm", "runAroundRightMm", "runAroundTopMm", "runAroundBottomMm"] as const) {
    const value = frame[key];
    if (value !== undefined && !(typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= CLEARANCE_MAX_MM)) return false;
  }
  return true;
}
