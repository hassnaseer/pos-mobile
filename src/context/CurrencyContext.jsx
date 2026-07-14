import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import apiClient from '../services/api/globalApi';
import { isSuperAdmin, PERMISSIONS } from '../utils/permissions';
import { getUSDExchangeRates } from '../utils/currency';

// Matches the backend's settings.service.ts isSettingsAllowed check — a staff
// member without one of these codes always gets a 403 from /admin/settings,
// so skip the request entirely instead of firing a call we know will fail.
const SETTINGS_PERMS = [
  PERMISSIONS.SYSTEM_SETTINGS, PERMISSIONS.MANAGE_SUPPLIERS, PERMISSIONS.MANAGE_MANUFACTURERS,
  PERMISSIONS.MANAGE_TAXES, PERMISSIONS.MANAGE_CONDITIONS, PERMISSIONS.MANAGE_BUSINESSES,
];

export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', PKR: 'Rs', INR: '₹', AED: 'د.إ',
  SAR: '﷼', BDT: '৳', CAD: 'C$', AUD: 'A$', NZD: 'NZ$', SGD: 'S$',
  MYR: 'RM', THB: '฿', JPY: '¥', CNY: '¥', KRW: '₩', TRY: '₺',
  ZAR: 'R', NGN: '₦',
};

const COUNTRY_CURRENCY = {
  Pakistan: 'PKR', India: 'INR', Bangladesh: 'BDT',
  'United States': 'USD', Canada: 'CAD', 'United Kingdom': 'GBP',
  Germany: 'EUR', France: 'EUR', Italy: 'EUR', Spain: 'EUR', Netherlands: 'EUR',
  UAE: 'AED', 'United Arab Emirates': 'AED', 'Saudi Arabia': 'SAR',
  Australia: 'AUD', 'New Zealand': 'NZD', Singapore: 'SGD',
  Malaysia: 'MYR', Thailand: 'THB', Japan: 'JPY', China: 'CNY',
  'South Korea': 'KRW', Turkey: 'TRY', 'South Africa': 'ZAR', Nigeria: 'NGN',
};

const defaultFmt = n => (n != null ? `$${(n || 0).toFixed(2)}` : '—');

const CurrencyContext = createContext({
  currency: 'USD',
  symbol: '$',
  invoiceTerms: '',
  fmt: defaultFmt,
  rates: null,
  refreshCurrency: () => {},
});

export function CurrencyProvider({ children }) {
  const { user } = useAuth();
  // Seed straight from the login/profile response so the right currency shows
  // immediately even for staff who can't call /admin/settings at all.
  const [currency, setCurrency] = useState(user?.currency ?? 'USD');
  const [invoiceTerms, setInvoiceTerms] = useState('');
  const [rates, setRates] = useState(null);

  useEffect(() => { getUSDExchangeRates().then(setRates); }, []);

  useEffect(() => {
    if (user?.currency) setCurrency(user.currency);
  }, [user?.currency]);

  const canAccessSettings = user && (
    user.role === 'admin' ||
    (Array.isArray(user.permissionCodes) && SETTINGS_PERMS.some(p => user.permissionCodes.includes(p)))
  );

  const fetchSettings = useCallback(async () => {
    if (!user || isSuperAdmin(user.role) || !canAccessSettings) return;
    try {
      const res = await apiClient.get('/admin/settings');
      const data = res?.data ?? res;
      if (!data) return;
      const { currency: cur, country, invoiceTerms: terms } = data;
      if (cur) {
        setCurrency(cur);
      } else if (country && COUNTRY_CURRENCY[country]) {
        setCurrency(COUNTRY_CURRENCY[country]);
      }
      if (terms !== undefined) setInvoiceTerms(terms ?? '');
    } catch {
      // silently keep defaults
    }
  }, [user, canAccessSettings]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const symbol = CURRENCY_SYMBOLS[currency] ?? (currency + ' ');

  const fmt = n => {
    if (n == null) return '—';
    return `${symbol}${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, symbol, invoiceTerms, fmt, rates, refreshCurrency: fetchSettings }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
