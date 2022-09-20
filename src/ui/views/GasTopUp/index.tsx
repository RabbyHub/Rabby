import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bgIcon from '@/ui/assets/gas-top-up/light.svg';
import { Button, Skeleton, Space } from 'antd';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { useAsync, useAsyncRetry } from 'react-use';
import { useWallet } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { ChainSelect, ConfirmDrawer } from './components';
import { TokenItem } from '@/background/service/openapi';
import { GAS_TOP_UP_ADDRESS, MINIMUM_GAS_LIMIT } from '@/constant';

const GasList = [20, 50, 100];

const EthGasList = [100, 200, 500];

const ETHGasTokenChains = [
  CHAINS_ENUM.ETH,
  CHAINS_ENUM.ARBITRUM,
  CHAINS_ENUM.BOBA,
  CHAINS_ENUM.OP,
  CHAINS_ENUM.NOVA,
  CHAINS_ENUM.AURORA,
];

export const GasTopUp = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const history = useHistory();

  const [visible, setVisible] = useState(false);

  const [token, setToken] = useState<TokenItem | undefined>();

  const [chain, setChain] = useState(CHAINS_ENUM.ETH);

  const [index, setIndex] = useState(0);

  const { value: gasToken, loading: gasTokenLoading } = useAsync(async () => {
    const account = await wallet.getCurrentAccount();
    const chainId = CHAINS[chain].serverId;
    const tokenId = CHAINS[chain].nativeTokenAddress;
    return await wallet.openapi.getToken(account!.address, chainId, tokenId);
  }, [chain]);

  const { value: instantGas, loading: gasLoading } = useAsync(async () => {
    const list = await wallet.openapi.gasMarket(CHAINS[chain].serverId);
    let instant = list[0];
    for (let i = 1; i < list.length; i++) {
      if (list[i].price > instant.price) {
        instant = list[i];
      }
    }
    return instant;
  }, [chain, wallet]);

  const {
    value: tokenList,
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
    return sortedTokens;
  });

  const [key, setKey] = useState(0);

  const prices = useMemo(() => {
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
  }, [instantGas]);

  console.log(
    'instantGasValue',
    instantGasValue.toString(10),
    new BigNumber(prices[index]?.[0] || 0).times(0.2).times(0.1).toString(10),
    gasToken?.price,
    instantGas?.price
  );

  const handleClickBack = () => {
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
      if (lastChain && CHAINS[lastChain]) {
        setChain(lastChain);
      }
    };
    getLastChain();
  }, []);

  useEffect(() => {
    if (!visible) {
      setTimeout(() => {
        setKey((e) => e + 1);
      }, 300);
    }
  }, [visible]);

  useEffect(() => {
    if (instantGasValue && prices[index] && gasToken) {
      if (
        instantGasValue.gt(
          new BigNumber(prices[index][0]).times(0.2).times(0.1)
        )
      ) {
        setIndex((index) => index + 1);
      }
    }
  }, [instantGasValue, index, prices, gasToken]);

  const gasTopUp = async () => {
    if (!token || !gasToken || !prices[index]) return;
    const sendValue = new BigNumber(prices[index][0] || 0)
      .times(1.2)
      .div(token.price)
      .times(10 ** token.decimals)
      .toFixed(0);
    try {
      wallet.gasTopUp({
        to: GAS_TOP_UP_ADDRESS,
        toChainId: CHAINS[chain].serverId,
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

  return (
    <div
      className="relative p-20 pt-0 h-full bg-gray-bg"
      style={{
        background: `url(${bgIcon}) no-repeat`,
      }}
    >
      <PageHeader onBack={handleClickBack} forceShowBack invertBack>
        <span className="text-white">{t('Instant Gas Top Up')}</span>
      </PageHeader>
      <div className="text-12 leading-[17px] text-white pt-[4px] pb-[24px]">
        {t('gasTopUpDescribe')}
      </div>

      <div className="w-[360px] h-[284px] bg-white rounded-[6px] px-[16px] py-[32px]">
        <div className="text-15 mb-12 font-medium">{t('Top Up Chain')}</div>
        <ChainSelect value={chain} onChange={setChain} />

        <div className="mt-[40px] mb-[12px] font-medium">{t('Amount')}</div>
        <Space size={8}>
          {prices.map((e, i) => (
            <div
              key={e[1]}
              className={clsx(
                'w-[104px] h-[56px] cursor-pointer rounded border  text-center flex flex-col items-center justify-center',

                instantGasValue.gt(new BigNumber(e[0]).times(0.2).times(0.1))
                  ? 'cursor-not-allowed opacity-[0.6] bg-gray-light bg-opacity-[0.8]  border-transparent'
                  : i === index
                  ? 'bg-blue-light border-blue-light bg-opacity-[0.1]'
                  : 'bg-gray-bg border-transparent hover:border-blue-light'
              )}
              onClick={() => {
                if (
                  !instantGasValue.gt(new BigNumber(e[0]).times(0.2).times(0.1))
                ) {
                  setIndex(i);
                }
              }}
              title={'当前网络拥堵手续费较高，该充值金额暂不支持'}
            >
              <div
                className={clsx(
                  'text-15 text-gray-title font-medium ',
                  i === index && 'text-blue-light'
                )}
              >
                ${e[0]}
              </div>
              {gasTokenLoading ? (
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
                    'text-12 text-gray-subTitle mt-2',
                    i === index && 'text-blue-light'
                  )}
                >
                  ≈ ${e[1]} {gasToken?.symbol}
                </div>
              )}
            </div>
          ))}
        </Space>
      </div>
      <div className="flex justify-center ">
        <Button
          style={{
            width: 280,
            height: 52,
            marginTop: 63,
          }}
          type="primary"
          size="large"
          onClick={() => {
            setVisible(true);
            setLastSelectedGasTopUpChain();
          }}
          loading={gasLoading || gasTokenLoading}
          disabled={index > prices.length - 1 || gasLoading || gasTokenLoading}
        >
          {t('Continue')}
        </Button>
      </div>

      <ConfirmDrawer
        key={key}
        visible={visible}
        onClose={() => setVisible(false)}
        cost={prices?.[index]?.[0] ? prices?.[index]?.[0] + '' : '0'}
        list={tokenList}
        token={token}
        onChange={setToken}
        onConfirm={gasTopUp}
        loading={tokenListLoading || gasTokenLoading}
        retry={retryFetchTokenList}
      />
    </div>
  );
};

export default GasTopUp;
