/**
 * Parses a date-only value (e.g. "2026-07-20", or a UTC-midnight timestamp like
 * "2026-07-20T00:00:00.000Z" that a date-only DB column can serialize into) into a Date
 * constructed in the LOCAL timezone. `new Date("2026-07-20")` is parsed as UTC midnight,
 * so any local-timezone formatting applied afterwards (toLocaleDateString, getMonth/getFullYear)
 * shows the previous calendar day for a user in a timezone behind UTC. Splitting the string
 * and using the local-time Date constructor avoids that shift entirely.
 */
export const parseDateOnly = (value) => {
  if (!value) return new Date(NaN);
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Today's date as 'YYYY-MM-DD' in the device's LOCAL calendar day — never
 * `new Date().toISOString().slice(0, 10)`, which is always UTC and rolls over to the previous
 * day (relative to the device's own clock) for anyone in a timezone ahead of UTC during
 * early-morning hours.
 */
export const todayDateOnly = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDate = (timestamp) => {
  if (!timestamp) return "";
  
  // Handle microseconds (remove everything after the first ".")
  const cleanTimestamp = timestamp.split(".")[0];
  const date = new Date(cleanTimestamp);
  if (isNaN(date)) return timestamp; // invalid date case

  // Format as "Aug 12, 2025"
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
