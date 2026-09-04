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
  source?: {
    type: "reference" | "archive" | "publication";
    label?: string;
  };
};

const dateEvents: DateEvent[] = [
  {
    id: "sample-independent-event",
    date: { month: 1, day: 1 },
    title: {
      en: "New year historical marker",
      ur: "نئے سال کا تاریخی نشان",
    },
    description: {
      en: "Internal seed event for UI verification.",
      ur: "اندرونی جانچ کے لیے نمونہ واقعہ۔",
    },
    source: {
      type: "reference",
      label: "Internal reference",
    },
  },
  {
    id: "sample-year-event",
    date: { month: 5, day: 5 },
    year: 2026,
    title: {
      en: "Year specific sample event",
      ur: "مخصوص سال کا نمونہ واقعہ",
    },
    source: {
      type: "archive",
      label: "Archive placeholder",
    },
  },
];

export function getDateEvents(date: { year: number; month: number; day: number }): DateEvent[] {
  return dateEvents.filter((event) =>
    event.date.month === date.month &&
    event.date.day === date.day &&
    (!event.year || event.year === date.year)
  );
}
