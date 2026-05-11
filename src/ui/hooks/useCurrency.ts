import { CurrencyItem } from '@/background/service/openapi';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
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
  const dispatch = useRabbyDispatch();

  const currencyCode = useRabbySelector((state) => state.currency.currency);
  const currencyList = useRabbySelector((state) => state.currency.currencyList);

  const currency = useMemo(() => {
    return (
      currencyList.find((item) => item.code === currencyCode) || USD_CURRENCY
    );
  }, [currencyCode, currencyList]);

  const setCurrentCurrency = useCallback(
    (code: string) => dispatch.currency.setCurrency(code),
    [dispatch.currency]
  );

  const syncCurrencyList = useCallback(
    (force = false) => dispatch.currency.syncCurrencyList({ force }),
    [dispatch.currency]
  );

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
