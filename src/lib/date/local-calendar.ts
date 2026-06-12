interface LocalCalendarDateOptions {
  timeZone?: string;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function formatLocalCalendarDate(
  date = new Date(),
  options: LocalCalendarDateOptions = {}
) {
  if (options.timeZone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone: options.timeZone,
      year: "numeric"
    }).formatToParts(date);
    const partByType = new Map(parts.map((part) => [part.type, part.value]));

    return [
      partByType.get("year"),
      partByType.get("month"),
      partByType.get("day")
    ].join("-");
  }

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join("-");
}
