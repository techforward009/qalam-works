"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const themes = ["system", "light", "dark"] as const;
export default function QuranThemeControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-10 sm:hidden" aria-hidden="true" />;
  const current = themes.includes(theme as typeof themes[number]) ? theme as typeof themes[number] : "system";
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;
  return (
    <div className="flex justify-end px-4 py-2 sm:hidden" data-quran-mobile-theme="inline">
      <button
        type="button"
        onClick={() => setTheme(themes[(themes.indexOf(current) + 1) % themes.length])}
        aria-label="Change theme / ظاہری رنگ بدلیں"
        title="Change theme / ظاہری رنگ بدلیں"
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-emerald-700/20 bg-white text-emerald-900 shadow-sm dark:bg-slate-900 dark:text-white"
      >
        <Icon size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
