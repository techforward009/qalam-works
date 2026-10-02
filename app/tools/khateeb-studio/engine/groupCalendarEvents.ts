import type { ShiaCalendarEvent } from "./shiaCalendar";

export type CalendarEventGroup = {
  key: string;
  representative: ShiaCalendarEvent;
  items: readonly ShiaCalendarEvent[];
};

export function groupCalendarEvents(
  events: readonly ShiaCalendarEvent[],
): CalendarEventGroup[] {
  const groups = new Map<string, ShiaCalendarEvent[]>();

  for (const event of events) {
    const key = [
      event.month,
      event.day,
      event.dayLabel ?? "",
      event.title,
    ].join("|");

    const items = groups.get(key);
    if (items) {
      items.push(event);
    } else {
      groups.set(key, [event]);
    }
  }

  return [...groups.entries()].map(([key, items]) => ({
    key,
    representative: items[0],
    items,
  }));
}
