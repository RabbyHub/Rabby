import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcBubleInBg } from '@/ui/assets/gas-top-up/bulb-in-bg.svg';
import { Button, message, Skeleton, Space, Tooltip } from 'antd';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { useAsync, useAsyncRetry, useCss } from 'react-use';
import { useWallet } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { ChainSelect, ConfirmDrawer } from './components';
import { TokenItem } from '@/background/service/openapi';
import {
  GAS_TOP_UP_ADDRESS,
  GAS_TOP_UP_SUPPORT_TOKENS,
  MINIMUM_GAS_LIMIT,
} from '@/constant';
import stats from '@/stats';
import { findChainByEnum } from '@/utils/chain';
import { getTokenSymbol } from '@/ui/utils/token';

const GasList = [20, 50, 100];

const EthGasList = [100, 200, 500];

const ETHGasTokenChains = [CHAINS_ENUM.ETH, CHAINS_ENUM.RSK];

export const GasTopUp = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const history = useHistory();

  const [visible, setVisible] = useState(false);

  const [token, setToken] = useState<TokenItem | undefined>();

  const [chain, setChain] = useState(CHAINS_ENUM.ETH);
  const chainItem = useMemo(() => findChainByEnum(chain)!, [chain]);

  const [index, setIndex] = useState(0);

  const {
    value: gasToken,
    loading: gasTokenLoading,
    error: gasTokenError,
  } = useAsync(async () => {
    const account = await wallet.getCurrentAccount();
    const chainId = chainItem.serverId;
    const tokenId = chainItem.nativeTokenAddress;
    return await wallet.openapi.getToken(account!.address, chainId, tokenId);
  }, [chainItem]);

  const {
    value: instantGas,
    loading: gasLoading,
    error: instantGasError,
  } = useAsync(async () => {
    const list = await wallet.openapi.gasMarket(chainItem.serverId);
    let instant = list[0];
    for (let i = 1; i < list.length; i++) {
      if (list[i].price > instant.price) {
        instant = list[i];
      }
    }
    return instant;
  }, [chainItem, wallet]);

  const {
    value: chainUsdBalance,
    loading: chainUsdBalanceLoading,
    error: chainUsdBalanceError,
  } = useAsync(async () => {
    const data = await wallet.openapi.getGasStationChainBalance(
      chainItem.serverId,
      GAS_TOP_UP_ADDRESS
    );
    return data.usd_value;
  }, [chainItem, wallet]);

  const {
    value: tokenList = [],
    loading: tokenListLoading,
    error,
    retry,
  } = useAsyncRetry(async () => {
    const account = await wallet.getCurrentAccount();
    const tokens = await wallet.openapi.listToken(account!.address);
    const sortedTokens = tokens.sort((a, b) =>
      new BigNumber(b.amount)
        .times(new BigNumber(b.price || 0))
        .minus(new BigNumber(a.amount).times(new BigNumber(a.price || 0)))
        .toNumber()
    );
    return sortedTokens.filter(
      (e) =>
        !(
          e.chain === chainItem.serverId &&
          e.id === chainItem.nativeTokenAddress
        )
    );
  }, [chainItem]);

  const {
    value: gasStationSupportedTokenMap = {},
    error: gasStationSupportedTokenMapError,
  } = useAsync(async () => {
    const list = await wallet.openapi.getGasStationTokenList();
    return list.reduce((pre, now) => {
      pre[now.chain.toLowerCase() + ':' + now.id.toLowerCase()] = true;
      return pre;
    }, {} as Record<string, true>);
  }, [chain]);

  const availableTokenList = useMemo(
    () =>
      tokenList.filter(
        (token) =>
          GAS_TOP_UP_SUPPORT_TOKENS[token.chain]?.includes(token.id) &&
          !!gasStationSupportedTokenMap[
            token.chain.toLowerCase() + ':' + token.id.toLowerCase()
          ]
      ),
    [chain, tokenList, gasStationSupportedTokenMap]
  );

  const prices: [number, string][] = useMemo(() => {
    if (ETHGasTokenChains.includes(chain)) {
      return EthGasList.map((e) => [
        e,
        new BigNumber(e).div(gasToken?.price || 1).toFixed(2),
      ]);
    }
    return GasList.map((e) => [
      e,
      new BigNumber(e).div(gasToken?.price || 1).toFixed(2),
    ]);
  }, [gasToken, chain]);

  const instantGasValue = useMemo(() => {
    let gasValue = new BigNumber(0);
    if (instantGas && gasToken) {
      gasValue = new BigNumber(instantGas.price)
        .times(MINIMUM_GAS_LIMIT)
        .div(10 ** gasToken.decimals)
        .times(gasToken.price);
    }
    return gasValue;
  }, [instantGas, gasToken]);

  const btnDisabled = useMemo(
    () =>
      index >= prices.length ||
      new BigNumber(chainUsdBalance || 0).lt(prices[index][0]) ||
      gasLoading ||
      gasTokenLoading ||
      chainUsdBalanceLoading,
    [
      index,
      prices,
      chainUsdBalance,
      gasLoading,
      gasTokenLoading,
      chainUsdBalanceLoading,
    ]
  );

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    }
    history.replace('/');
  };

  const setLastSelectedGasTopUpChain = async () => {
    const account = await wallet.getCurrentAccount();
    if (!account) return;
    wallet.setLastSelectedGasTopUpChain(account.address, chain);
  };

  const isFirstRef = useRef(true);
  useEffect(() => {
    const getLastChain = async () => {
      if (!isFirstRef) {
        return;
      }
      isFirstRef.current = false;
      const account = await wallet.getCurrentAccount();
      if (!account) return;
      const lastChain = await wallet.getLastSelectedGasTopUpChain(
        account.address
      );
      if (lastChain && findChainByEnum(lastChain)) {
        setChain(lastChain);
      }
    };
    getLastChain();
  }, []);

  useEffect(() => {
    const isLoading = gasLoading || gasTokenLoading;
    if (!isLoading && instantGasValue && gasToken && index >= prices.length) {
      const i = prices.findIndex((e) =>
        instantGasValue.lte(new BigNumber(e[0]).times(0.2).times(0.1))
      );
      if (prices[i]) {
        setIndex(i);
      }
      return;
    }

    if (!isLoading && instantGasValue && prices[index] && gasToken) {
      if (
        instantGasValue.gt(
          new BigNumber(prices[index][0]).times(0.2).times(0.1)
        )
      ) {
        setIndex((index) => index + 1);
      }
    }
  }, [gasLoading, gasTokenLoading, instantGasValue, index, prices, gasToken]);

  useEffect(() => {
    if (
      chainUsdBalanceError ||
      error ||
      gasTokenError ||
      instantGasError ||
      gasStationSupportedTokenMapError
    ) {
      message.error(
        error?.message ||
          chainUsdBalanceError?.message ||
          gasTokenError?.message ||
          instantGasError?.message ||
          gasStationSupportedTokenMapError?.message
      );
    }
  }, [
    chainUsdBalanceError,
    error,
    gasTokenError,
    instantGasError,
    gasStationSupportedTokenMapError,
  ]);

  const gasTopUp = async () => {
    if (!token || !gasToken || !prices[index]) return;
    const sendValue = new BigNumber(prices[index][0] || 0)
      .times(1.2)
      .div(token.price)
      .times(10 ** token.decimals)
      .toFixed(0);

    try {
      wallet.gasTopUp({
        $ctx: {
          ga: {
            category: 'GasTopUp',
            source: 'GasTopUp',
            trigger: '',
          },
          stats: {
            afterSign: [
              {
                name: 'gasTopUpClickSign',
                params: {
                  topUpChain: gasToken!.chain,
                  topUpAmount: prices[index][0],
                  topUpToken: gasToken!.symbol,
                  paymentChain: `${token.chain}:${token.symbol}`,
                },
              },
            ],
          },
        },
        gasTokenSymbol: gasToken.symbol,
        paymentTokenSymbol: token.symbol,
        fromUsdValue: prices[index][0],
        to: GAS_TOP_UP_ADDRESS,
        toChainId: chainItem.serverId,
        rawAmount: sendValue,
        chainServerId: token.chain,
        tokenId: token.id,
        fromTokenAmount: new BigNumber(prices[index][0])
          .times(1.2)
          .div(token.price)
          .toString(10),
        toTokenAmount: new BigNumber(prices[index][0])
          .div(gasToken.price)
          .toString(10),
      });
      window.close();
    } catch (error) {
      console.log('error', error);
    }
  };

  const retryFetchTokenList = () => {
    if (error) {
      retry();
    }
  };

  const handleContinue = () => {
    setVisible(true);
    setLastSelectedGasTopUpChain();
    stats.report('gasTopUpContinue', {
      topUpChain: gasToken!.chain,
      topUpAmount: prices[index][0],
      topUpToken: gasToken!.symbol,
    });
  };

  return (
    <div className="relative pt-0 h-full bg-r-neutral-bg-2">
      <div className="absolute top-0 left-0 right-0 h-[217px] bg-r-blue-default dark:bg-r-blue-disable">
        <RcBubleInBg className="absolute right-[25px] top-[35px] z-[0]" />
      </div>
      <div className="p-20 pt-0 h-full relative bg-transparent">
        <PageHeader
          onBack={handleClickBack}
          forceShowBack
          invertBack
          keepBackLightVersion
        >
          <span className="text-white">{t('page.gasTopUp.title')}</span>
        </PageHeader>
        <div className="text-12 leading-[17px] text-r-neutral-title-2 pt-[4px] pb-[24px]">
          {t('page.gasTopUp.description')}
        </div>

        <div
          className="w-[360px] h-[284px] bg-r-neutral-bg-1 rounded-[6px] px-[16px] py-[32px]"
          style={{
            boxShadow: 'var(--rabby-custom-box-shadow__gas-top-up)',
          }}
        >
          <div className="text-15 font-medium text-r-neutral-title-1 mb-12">
            {t('page.gasTopUp.topUpChain')}
          </div>
          <ChainSelect value={chain} onChange={setChain} />

          <div className="text-15 font-medium text-r-neutral-title-1 mt-[40px] mb-[12px]">
            {t('page.gasTopUp.Amount')}
          </div>
          <Space size={8}>
            {prices.map((e, i) => (
              <GasBox
                key={i + chain}
                chainUsdBalanceLoading={chainUsdBalanceLoading}
                instantGasValue={instantGasValue}
                item={e}
                selectedIndex={index}
                index={i}
                onSelect={setIndex}
                gasTokenLoading={gasTokenLoading}
                gasToken={gasToken}
                chainUsdBalance={chainUsdBalance}
              />
            ))}
          </Space>
        </div>
        <div className="flex justify-center ">
          <Button
            className="mt-[63px] h-[52px] w-[360px]"
            type="primary"
            size="large"
            onClick={handleContinue}
            disabled={btnDisabled}
          >
            {t('page.gasTopUp.Continue')}
          </Button>
        </div>
      </div>

      <ConfirmDrawer
        visible={visible}
        onClose={() => {
          setVisible(false);
          setToken(undefined);
        }}
        cost={prices?.[index]?.[0] ? prices?.[index]?.[0] + '' : '0'}
        list={availableTokenList}
        token={token}
        onChange={setToken}
        onConfirm={gasTopUp}
        loading={tokenListLoading || gasTokenLoading}
        retry={retryFetchTokenList}
      />
    </div>
  );
};

interface GasBoxProps {
  gasToken?: TokenItem;
  chainUsdBalance?: number;
  chainUsdBalanceLoading: boolean;
  instantGasValue: BigNumber;
  item: [number, string];
  selectedIndex: number;
  index: number;
  onSelect: (i: number) => void;
  gasTokenLoading: boolean;
}
const GasBox = ({
  chainUsdBalanceLoading,
  chainUsdBalance,
  instantGasValue,
  index,
  selectedIndex,
  onSelect,
  gasTokenLoading,
  gasToken,
  item,
}: GasBoxProps) => {
  const { t } = useTranslation();
  const gasCostExceedsBudget = useMemo(
    () => instantGasValue.gt(new BigNumber(item[0]).times(0.2).times(0.1)),
    [instantGasValue, item[0]]
  );
  const chainInsufficientBalance = useMemo(
    () =>
      !chainUsdBalanceLoading &&
      chainUsdBalance !== undefined &&
      new BigNumber(chainUsdBalance).lt(item[0]),
    [chainUsdBalanceLoading, chainUsdBalance, item[0]]
  );

  const tooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: `calc(50% ${index - 1 > 0 ? '+' : '-'} ${Math.abs(
        (index - 1) * 108
      )}px )`,
    },
  });

  return (
    <Tooltip
      overlayClassName={clsx(
        'rectangle max-w-[328px] left-[32px]',
        tooltipsClassName
      )}
      placement="top"
      visible={
        gasCostExceedsBudget || chainInsufficientBalance ? undefined : false
      }
      title={
        chainInsufficientBalance
          ? t('page.gasTopUp.InsufficientBalance')
          : gasCostExceedsBudget
          ? t('page.gasTopUp.hightGasFees')
          : ''
      }
    >
      <div
        key={item[1]}
        className={clsx(
          'w-[104px] h-[56px] cursor-pointer rounded border text-center flex flex-col items-center justify-center',

          gasCostExceedsBudget || chainInsufficientBalance
            ? 'cursor-not-allowed opacity-[0.6] bg-r-neutral-card-2 border-transparent'
            : index === selectedIndex
            ? 'bg-r-blue-light-1 border-rabby-blue-default'
            : 'bg-r-neutral-card-2 border-transparent hover:border-rabby-blue-default'
        )}
        onClick={() => {
          if (!(gasCostExceedsBudget || chainInsufficientBalance)) {
            onSelect(index);
          }
        }}
      >
        <div
          className={clsx(
            'text-15 text-r-neutral-title-1 font-medium ',
            !(gasCostExceedsBudget || chainInsufficientBalance) &&
              index === selectedIndex &&
              'text-blue-light'
          )}
        >
          ${item[0]}
        </div>
        {gasTokenLoading || chainUsdBalanceLoading ? (
          <Skeleton.Input
            active
            style={{
              width: 60,
              height: 14,
            }}
          />
        ) : (
          <div
            className={clsx(
              'text-12 text-r-neutral-body mt-2',
              !(gasCostExceedsBudget || chainInsufficientBalance) &&
                index === selectedIndex &&
                'text-blue-light'
            )}
          >
            ≈ {item[1]} {getTokenSymbol(gasToken)}
          </div>
        )}
      </div>
    </Tooltip>
  );
};

export default GasTopUp;
