import type { AnalyticsEventName, AnalyticsProps } from "./types";
import { FORBIDDEN_PROP_KEYS } from "./types";

const ALLOWED_KEYS = new Set([
  "tool",
  "mode",
  "resolved_mode",
  "input_method",
  "export_format",
  "success",
  "error_code",
  "nav_source",
  "target_tool",
  "count_bucket",
  "tab",
]);

/** Strip any property not on the allow-list. Never throws. */
export function sanitizeAnalyticsProps(props?: AnalyticsProps): Record<string, string | number | boolean> {
  if (!props || typeof props !== "object") return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_PROP_KEYS.includes(key as (typeof FORBIDDEN_PROP_KEYS)[number])) continue;
    if (!ALLOWED_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Fire a typed product analytics event.
 * Failures are swallowed — analytics must never break tools.
 */
export function trackEvent(name: AnalyticsEventName, props?: AnalyticsProps): void {
  try {
    if (typeof window === "undefined") return;
    const safe = sanitizeAnalyticsProps(props);
    // Dynamic import path avoided for simplicity; track is sync-safe from package
    void import("@vercel/analytics").then(({ track }) => {
      try {
        track(name, safe);
      } catch {
        /* ignore provider errors */
      }
    }).catch(() => {
      /* ignore */
    });
  } catch {
    /* never throw */
  }
}

/** Fire once per page session for tool_open (module-level guard per tool). */
const openedTools = new Set<string>();

export function trackToolOpenOnce(tool: AnalyticsProps["tool"]): void {
  if (!tool || typeof window === "undefined") return;
  const key = tool;
  if (openedTools.has(key)) return;
  openedTools.add(key);
  trackEvent("tool_open", { tool });
}

/** Test helper — clear open guards. */
export function __resetOpenedToolsForTests(): void {
  openedTools.clear();
}
