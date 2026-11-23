const bookingTimeZone = "Asia/Kolkata";

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: bookingTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function kolkataDateOffset(days = 0, from = new Date()) {
  const parts = dateParts(from);
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function defaultKolkataSession(now = new Date()) {
  const parts = dateParts(now);
  let minutes = Number(parts.hour) * 60 + Number(parts.minute);
  minutes = Math.ceil((minutes + 1) / 30) * 30;
  const dateOffset = Math.floor(minutes / 1440);
  minutes %= 1440;
  return {
    date: kolkataDateOffset(dateOffset, now),
    time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
  };
}

export function bookingWindow(date: string, time: string, durationMinutes: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const start = new Date(`${date}T${time}:00+05:30`);
  if (!Number.isFinite(start.getTime())) return null;
  const end = new Date(start.getTime() + durationMinutes * 60000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

export function formatKolkataDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: bookingTimeZone,
  }).format(new Date(value));
}
