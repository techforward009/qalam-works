import type { DateEvent } from "@/app/tools/date-converter/utils/dateEvents";

export function HistoricalContext({ events }: { events: DateEvent[] }) {
  return (
    <section className="mt-6 rounded border p-4">
      <h2 className="text-xl font-semibold">Historical Context</h2>

      {events.length === 0 ? (
        <p className="mt-2 text-sm opacity-70">
          No historical events available for this date.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {events.map((event) => (
            <article key={event.id}>
              <h3 className="font-medium">{event.title.ur ?? event.title.en}</h3>
              {event.description && (
                <p>{event.description.ur ?? event.description.en}</p>
              )}

              {event.source && (
                <p className="text-sm opacity-70">
                  Source: {event.source.label ?? event.source.type}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
