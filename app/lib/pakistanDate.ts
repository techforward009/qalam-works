/** Civil date in Pakistan; independent of the server/browser timezone. */
export function pakistanDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return { year: Number(part("year")), iso: `${part("year")}-${part("month")}-${part("day")}` };
}
