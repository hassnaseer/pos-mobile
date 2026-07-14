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
