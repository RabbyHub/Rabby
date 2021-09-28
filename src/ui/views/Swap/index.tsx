import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from 'ui/component';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import { useWallet } from 'ui/utils';
import { CHAINS_ENUM } from 'consts';
import { TokenItem } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import './style.less';

const Swap = () => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const [chain, setChain] = useState(CHAINS_ENUM.BSC);
  const [from, setFrom] = useState<TokenItem>({
    id: 'bsc',
    chain: 'bsc',
    name: 'BNB',
    symbol: 'BNB',
    display_symbol: null,
    optimized_symbol: 'BNB',
    decimals: 18,
    logo_url:
      'https://static.debank.com/image/bsc_token/logo_url/bsc/8bfdeaa46fe9be8f5cd43a53b8d1eea1.png',
    price: 351.4,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    time_at: 0,
    amount: 0,
  });
  const [to, setTo] = useState<TokenItem>({
    amount: 0,
    chain: 'eth',
    decimals: 18,
    display_symbol: null,
    id: '0x4fabb145d64652a948d72533023f6e7a623c7c53',
    is_core: true,
    is_verified: true,
    is_wallet: true,
    logo_url:
      'https://static.debank.com/image/token/logo_url/0x4fabb145d64652a948d72533023f6e7a623c7c53/f0825e572298822e7689fe81150a195d.png',
    name: 'Binance USD',
    optimized_symbol: 'BUSD',
    price: 1,
    symbol: 'BUSD',
    time_at: 0,
  });
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  const handleTokenChange = (token: TokenItem) => {
    setFrom(token);
  };

  const init = async () => {
    setCurrentAccount(await wallet.syncGetCurrentAccount());
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="swap">
      <PageHeader>{t('Swap')}</PageHeader>
      <div className="swap-section">
        {currentAccount && (
          <TokenAmountInput
            address={currentAccount.address}
            token={from}
            onTokenChange={handleTokenChange}
          />
        )}
      </div>
    </div>
  );
};

export default Swap;
