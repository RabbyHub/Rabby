import React, { useEffect, useState } from 'react';
import ClipboardJS from 'clipboard';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Popover, Button, message, Skeleton } from 'antd';
import BigNumber from 'bignumber.js';
import { PageHeader, AddressViewer } from 'ui/component';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import PriceSlippageSelector from 'ui/component/PriceSlippageSelector';
import Quoting from './components/Quoting';
import { useWallet } from 'ui/utils';
import { formatTokenAmount, splitNumberByStep } from 'ui/utils/number';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { TokenItem } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import IconSwapArrow from 'ui/assets/swap-arrow.svg';
import { CopyNoBorder } from 'ui/assets';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';

const TokenPopoverContent = ({
  token,
  chain,
}: {
  token: TokenItem;
  chain: CHAINS_ENUM;
}) => {
  const { t } = useTranslation();
  const currentChain = CHAINS[chain];
  const isNative = currentChain.nativeTokenAddress === token.id;

  const handleClickCopy = () => {
    const clipboard = new ClipboardJS('.token-popover-content', {
      text: function () {
        return token.id;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  return (
    <div className="token-popover-content">
      {!isNative && (
        <p>
          <span>{t('Contract Address')}</span>
          <span>
            <AddressViewer address={token.id} showArrow={false} />
            <CopyNoBorder
              className="icon icon-copy"
              onClick={handleClickCopy}
            />
          </span>
        </p>
      )}
      <p>
        <span>{t('Chain')}</span>
        <span>{currentChain.name}</span>
      </p>
      <p>
        <span>{t('Price')}</span>
        <span>${splitNumberByStep(token.price.toFixed(2))}</span>
      </p>
    </div>
  );
};

const Swap = () => {
  const dapps = [
    {
      logo:
        'https://static.debank.com/image/project/logo_url/bsc_pancakeswap/a4e035cf4495755fddd5ebb6e5657f63.png',
      name: 'PancakeSwap',
      id: 'bsc_pancakeswap',
    },
    {
      logo:
        'https://static.debank.com/image/project/logo_url/bsc_1inch/a4fcc0d0e8daddd0313ad14172e11aff.png',
      name: '1inch',
      id: 'bsc_1inch',
    },
  ];
  const { t } = useTranslation();
  const wallet = useWallet();
  const history = useHistory();
  const [isLoading, setIsLoading] = useState(true);
  const [chain, setChain] = useState(CHAINS_ENUM.BSC);
  const [fromValue, setFromValue] = useState('0');
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
    chain: 'bsc',
    decimals: 18,
    display_symbol: null,
    id: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
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
  const [priceSlippage, setPriceSlippage] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const submitDisabled =
    !fromValue || Number(fromValue) <= 0 || from.id === to.id;

  const handleTokenChange = (token: TokenItem) => {
    console.log('tokenchange', token);
    if (token.id === to.id) {
      setTo(from);
    }
    setFrom(token);
    if (token.id !== from.id) {
      setFromValue('0');
    }
  };

  const loadToken = async (
    token: TokenItem,
    address: string
  ): Promise<TokenItem> => {
    return await wallet.openapi.getToken(address, token.chain, token.id);
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    setCurrentAccount(account);
    let needLoadFrom = from;
    let needLoadTo = to;
    const cache = JSON.parse(localStorage.getItem('swapCache') || '{}');
    if (localStorage.getItem('swapCache')) {
      setFrom(cache.from);
      needLoadFrom = cache.from;
      setTo(cache.to);
      needLoadTo = cache.to;
      setChain(cache.chain);
      setFromValue(cache.fromValue);
      setPriceSlippage(cache.priceSlippage);
    }
    const [fromToken, toToken] = await Promise.all([
      loadToken(needLoadFrom, account.address),
      loadToken(needLoadTo, account.address),
    ]);
    setFrom(fromToken);
    setTo(toToken);
    setIsLoading(false);
  };

  const handleClickFromBalance = () => {
    const value = new BigNumber(from.amount).toFixed();
    setFromValue(value);
  };

  const handleChainChanged = (value: CHAINS_ENUM) => {
    setChain(value);
  };

  const handleToTokenChange = (token: TokenItem) => {
    if (token.id === from.id) {
      setFrom(to);
    }
    setTo(token);
  };

  const handlePriceSlippageChange = (val: number) => {
    setPriceSlippage(val);
  };

  const loadQuotes = async () => {
    const pancakeRes = await axios.get('https://api.debank.com/swap/check', {
      params: {
        dex_id: dapps[0].id,
        pay_token_id: from.id,
        pay_token_amount: new BigNumber(fromValue).times(1e18).toFixed(),
        receive_token_id: to.id,
        user_addr: currentAccount?.address,
        max_slippage: priceSlippage / 100,
        chain: CHAINS[chain].serverId,
      },
    });
    setCurrentIndex(1);
    const inchRes = await axios.get('https://api.debank.com/swap/check', {
      params: {
        dex_id: dapps[1].id,
        pay_token_id: from.id,
        pay_token_amount: new BigNumber(fromValue).times(1e18).toFixed(),
        receive_token_id: to.id,
        user_addr: currentAccount?.address,
        max_slippage: priceSlippage / 100,
        chain: CHAINS[chain].serverId,
      },
    });
    history.push({
      pathname: '/swap-confirm',
      state: {
        data: { dapp: dapps[0], data: pancakeRes.data.data },
        from,
        to,
        fromValue,
        chainId: chain,
        priceSlippage: priceSlippage / 100,
      },
    });
  };

  const handleGoPrevStep = () => {
    setCurrentStep(currentStep - 1);
    if (currentStep === 1) {
      setCurrentIndex(0);
    }
  };

  const handleGetQuote = () => {
    setCurrentStep(1);
    loadQuotes();
    localStorage.setItem(
      'swapCache',
      JSON.stringify({
        chain,
        fromValue,
        from,
        to,
        priceSlippage,
      })
    );
  };

  const handleFromValueChange = (value: string) => {
    if (/^\d*(\.\d*)?$/.test(value)) {
      setFromValue(value);
    }
  };

  useEffect(() => {
    const target = CHAINS[chain];

    setFrom({
      id: target.serverId,
      chain: target.serverId,
      name: target.nativeTokenSymbol,
      symbol: target.nativeTokenSymbol,
      display_symbol: null,
      optimized_symbol: target.nativeTokenSymbol,
      decimals: 18,
      logo_url: target.nativeTokenLogo,
      price: 0,
      is_verified: true,
      is_core: true,
      is_wallet: true,
      time_at: 0,
      amount: 0,
    });
  }, [chain]);

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="swap">
      {currentAccount && (
        <>
          <PageHeader>{t('Swap')}</PageHeader>
          <TagChainSelector value={chain} onChange={handleChainChanged} />
          <div className="swap-section">
            <div className="from-balance">
              <span className="cursor-pointer" onClick={handleClickFromBalance}>
                {isLoading ? (
                  <Skeleton.Input active style={{ width: 100 }} />
                ) : (
                  `${t('Balance')}: ${formatTokenAmount(from.amount, 8)}`
                )}
              </span>
            </div>
            <TokenAmountInput
              address={currentAccount.address}
              token={from}
              value={fromValue}
              chainId={CHAINS[chain].serverId}
              onTokenChange={handleTokenChange}
              onChange={handleFromValueChange}
            />
            <div className="from-token">
              <Popover
                placement="topRight"
                overlayClassName="token-popover"
                content={<TokenPopoverContent token={from} chain={chain} />}
              >
                <span className="from-token__name">{from.name}</span>
              </Popover>
              <span className="from-token__usdvalue">
                ≈ $
                {splitNumberByStep(
                  new BigNumber(fromValue || 0)
                    .times(new BigNumber(from.price || 0))
                    .toFixed()
                )}
              </span>
            </div>
            <div className="swap-arrow">
              <img src={IconSwapArrow} className="icon icon-swap-arrow" />
            </div>
            {currentAccount && (
              <TokenAmountInput
                address={currentAccount.address}
                token={to}
                chainId={CHAINS[chain].serverId}
                onTokenChange={handleToTokenChange}
                readOnly
              />
            )}
            <div className="to-token">
              <Popover
                placement="topRight"
                overlayClassName="token-popover"
                content={<TokenPopoverContent token={to} chain={chain} />}
              >
                <span className="to-token__name">{to.name}</span>
              </Popover>
            </div>
          </div>
          <div className="swap-section price-slippage-section">
            <p className="section-title">{t('Max price slippage')}</p>
            <PriceSlippageSelector
              value={priceSlippage}
              onChange={handlePriceSlippageChange}
            />
          </div>
          <div className="footer">
            <Button
              size="large"
              type="primary"
              className="w-[200px]"
              onClick={handleGetQuote}
              disabled={submitDisabled}
            >
              {t('Get Quotes')}
            </Button>
          </div>
          {currentStep === 1 && (
            <Quoting
              dapps={dapps}
              currentIndex={currentIndex}
              onCancel={handleGoPrevStep}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Swap;
