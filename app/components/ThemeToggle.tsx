"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";

const CYCLE: Array<"system" | "light" | "dark"> = ["system", "light", "dark"];

const LABELS: Record<string, string> = {
  system: "System theme (follows OS preference)",
  light: "Light theme",
  dark: "Dark theme",
};

const NEXT_LABEL: Record<string, string> = {
  system: "Switch to light theme",
  light: "Switch to dark theme",
  dark: "Switch to system theme",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render nothing until client is ready
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = (CYCLE.includes(theme as typeof CYCLE[number]) ? theme : "system") as typeof CYCLE[number];

  function cycleTheme() {
    const idx = CYCLE.indexOf(current);
    setTheme(CYCLE[(idx + 1) % CYCLE.length]);
  }

  const Icon = current === "dark" ? Moon : current === "light" ? Sun : Monitor;

  return (
    <button
      onClick={cycleTheme}
      className="fixed bottom-5 right-5 z-40 flex items-center justify-center w-10 h-10 rounded-full bg-[#1A3A2A]/90 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm hover:bg-[#1A3A2A] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8935A]"
      aria-label={NEXT_LABEL[current]}
      title={LABELS[current]}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
