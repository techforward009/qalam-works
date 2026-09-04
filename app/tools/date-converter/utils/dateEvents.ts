export type DateEventLocaleText = {
  en: string;
  ur?: string;
};

export type DateEvent = {
  id: string;
  date: {
    month: number;
    day: number;
  };
  year?: number;
  title: DateEventLocaleText;
  description?: DateEventLocaleText;
  category?: string;
  importance?: "low" | "medium" | "high";
  tags?: string[];
  source?: {
    type: "reference" | "archive" | "publication";
    label?: string;
  };
};

const dateEvents: DateEvent[] = [
  {
    id: "sample-independent-event",
    date: { month: 1, day: 1 },
    title: { en: "New year historical marker", ur: "نئے سال کا تاریخی نشان" },
    description: { en: "Internal seed event.", ur: "اندرونی نمونہ واقعہ۔" },
    category: "cultural",
    importance: "medium",
    tags: ["calendar", "sample"],
    source: { type: "reference", label: "Internal reference" }
  }
];

export function getDateEvents(date: { year: number; month: number; day: number }): DateEvent[] {
  return dateEvents.filter((event) =>
    event.date.month === date.month &&
    event.date.day === date.day &&
    (!event.year || event.year === date.year)
  );
}
