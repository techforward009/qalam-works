import type { DateEvent } from "@/app/tools/date-converter/utils/dateEvents";

export function HistoricalContext({ events }: { events: DateEvent[] }) {
  return (
    <section className="mt-6 rounded border p-4">
      <h2 className="text-xl font-semibold">Historical Context</h2>
      {events.length === 0 ? (
        <p>No historical events available for this date.</p>
      ) : (
        <div className="space-y-3 mt-3">
          {events.map((event) => (
            <article key={event.id}>
              <h3>{event.title.ur ?? event.title.en}</h3>
              <p>{event.description?.ur ?? event.description?.en}</p>
              {event.category && <p>Category: {event.category}</p>}
              {event.importance && <p>Importance: {event.importance}</p>}
              {event.source && (
                <p>Source: {event.source.label ?? event.source.type}</p>
              )}
              {event.tags && <p>Tags: {event.tags.join(", ")}</p>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
