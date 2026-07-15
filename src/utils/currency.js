/**
 * ExchangeRate-API (Free Version)
 * https://open.er-api.com/v6/latest/USD
 */
const BASE_URL = 'https://open.er-api.com/v6/latest/USD';

/**
 * Fetches the latest exchange rates for USD
 */
export async function getUSDExchangeRates() {
  try {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error('Failed to fetch rates');
    const data = await res.json();
    return data.rates || null;
  } catch (error) {
    return null;
  }
}

const trim1 = n => parseFloat(n.toFixed(1)).toString();

/** Mirrors web's frontend/src/app/utils/formatNumber.ts compactAmt — 11200 -> "Rs11.2k" */
export function compactAmt(symbol, n) {
  if (n == null) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${symbol}${trim1(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${symbol}${trim1(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${symbol}${trim1(abs / 1e3)}k`;
  return `${sign}${symbol}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
