export type HomepageToolAccent = {
  iconBg: string;
  iconColor: string;
  borderAccent: string;
  hoverShadow: string;
};

const EMERALD: HomepageToolAccent = {
  iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
  iconColor: "text-emerald-700 dark:text-emerald-400",
  borderAccent:
    "border-[#1A3A2A]/15 hover:border-emerald-500/40 dark:border-white/[0.08] dark:hover:border-emerald-700/40",
  hoverShadow: "hover:shadow-md hover:shadow-emerald-900/5",
};

const GOLD: HomepageToolAccent = {
  iconBg: "bg-[#B8935A]/10 dark:bg-[#B8935A]/15",
  iconColor: "text-[#9A6A30] dark:text-[#C9A46B]",
  borderAccent:
    "border-[#1A3A2A]/15 hover:border-[#B8935A]/50 dark:border-white/[0.08] dark:hover:border-[#B8935A]/40",
  hoverShadow: "hover:shadow-md hover:shadow-[#B8935A]/10",
};

const SAGE: HomepageToolAccent = {
  iconBg: "bg-[#1A3A2A]/8 dark:bg-[#2a5a3a]/50",
  iconColor: "text-[#1A3A2A] dark:text-[#8faa93]",
  borderAccent:
    "border-[#1A3A2A]/15 hover:border-[#1A3A2A]/30 dark:border-white/[0.08] dark:hover:border-[#8faa93]/35",
  hoverShadow: "hover:shadow-md hover:shadow-[#1A3A2A]/5",
};

export const HOME_TOOL_ACCENTS: Record<string, HomepageToolAccent> = {
  "/tools/document-studio":       GOLD,
  "/tools/roman-urdu-writer":     GOLD,
  "/tools/translation-studio":    SAGE,
  "/tools/document-cleaner":      EMERALD,
  "/tools/quality-checker":       EMERALD,
  "/tools/unicode-standardizer":  SAGE,
  "/tools/whatsapp-rtl-formatter": EMERALD,
  "/tools/invoice-generator":     GOLD,
  "/tools/date-converter":        SAGE,
};

export function getHomepageToolAccent(href: string): HomepageToolAccent {
  return HOME_TOOL_ACCENTS[href] ?? SAGE;
}
