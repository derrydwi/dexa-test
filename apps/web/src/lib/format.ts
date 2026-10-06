export { workDate as dateWib } from "@wfh/contracts";

export const timeWib = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "—";

export const formatDate = (value: string, long = false) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
    ...(long ? { weekday: "long" as const } : {}),
  }).format(new Date(`${value}T00:00:00+07:00`));

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
