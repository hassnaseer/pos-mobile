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
