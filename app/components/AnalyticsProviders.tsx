"use client";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel Web Analytics + Speed Insights.
 * Loaded client-side; does not block tool functionality if unavailable.
 */
export default function AnalyticsProviders() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
