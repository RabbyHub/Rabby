import { CurrencyItem } from '@/background/service/openapi';
import { useCurrencyStore } from '@/ui/state/currency';
import { formatCurrency } from '@/ui/utils';
import { useCallback, useMemo } from 'react';

const USD_CURRENCY: CurrencyItem = {
  code: 'USD',
  symbol: '$',
  usd_rate: 1,
  is_prefix: true,
  logo_url:
    'https://static.debank.com/image/country/logo_url/f253efe302d32ab264a76e0ce65be769/d47bf4d88f1d19912103106e80e4722c.png',
};

export function useCurrency() {
  const currencyCode = useCurrencyStore((state) => state.currency);
  const currencyList = useCurrencyStore((state) => state.currencyList);
  const setCurrentCurrency = useCurrencyStore((state) => state.setCurrency);
  const syncCurrencyList = useCurrencyStore((state) => state.syncCurrencyList);

  const currency = useMemo(() => {
    return (
      currencyList.find((item) => item.code === currencyCode) || USD_CURRENCY
    );
  }, [currencyCode, currencyList]);

  const formatCurrentCurrency = useCallback(
    (value: string | number) => formatCurrency(value, { currency }),
    [currency]
  );

  return {
    currency,
    currencyCode,
    currencyList,
    setCurrentCurrency,
    syncCurrencyList,
    formatCurrentCurrency,
  };
}
