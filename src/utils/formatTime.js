export function formatTimestamp(timestamp) {
  if (!timestamp) return "";

  // ✅ Ensure it's parsed as UTC
  const normalized = timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`;
  const date = new Date(normalized);
  const now = new Date();

  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  // ✅ Helpers
  const formatTime = d => {
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    return `${hours % 12 || 12}:${minutes} ${ampm}`;
  };

  const formatDate = d =>
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // ✅ Handle future timestamps (optional, prevents negative)
  if (diffMs < 0) return "just now";

  // ✅ Today
  if (date.toDateString() === now.toDateString()) {
    if (diffSec < 60) return "just now";
    if (diffMin < 60)
      return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
    return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  }

  // ✅ Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "yesterday";

  // ✅ Older than yesterday → show exact date & time
  return `${formatDate(date)} – ${formatTime(date)}`;
}
