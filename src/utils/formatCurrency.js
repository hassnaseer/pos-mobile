export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '0';

  // If it's a string with commas, remove them before converting
  const cleanedAmount = typeof amount === 'string' ? amount.replace(/,/g, '') : amount;

  const num = Number(cleanedAmount);

  if (isNaN(num)) return '0'; // fallback for invalid numbers

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  } else {
    return `${num.toLocaleString()}`;
  }
};
