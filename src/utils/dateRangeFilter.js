export const DATE_MODES = [
  { label: 'All Time', value: 'all' },
  { label: 'This Month', value: 'monthly' },
  { label: 'This Year', value: 'yearly' },
  { label: 'Custom', value: 'custom' },
];

const fmt = d => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function getDateRange(mode, customStart, customEnd) {
  const today = new Date();
  if (mode === 'all') return { from: '1970-01-01', to: fmt(today) };
  if (mode === 'custom') {
    if (!customStart && !customEnd) return { from: '1970-01-01', to: fmt(today) };
    return { from: customStart || undefined, to: customEnd || undefined };
  }
  if (mode === 'monthly') {
    const start = new Date(today); start.setDate(today.getDate() - 29);
    return { from: fmt(start), to: fmt(today) };
  }
  if (mode === 'yearly') return { from: `${today.getFullYear()}-01-01`, to: fmt(today) };
  return {};
}
