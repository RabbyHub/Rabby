import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bgIcon from '@/ui/assets/gas-top-up/light.svg';
import { Button, message, Skeleton, Space } from 'antd';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { useAsync } from 'react-use';
import { useWallet } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { ChainSelect, ConfirmDrawer } from './components';
import { TokenItem } from '@/background/service/openapi';
import { GAS_TOP_UP_ADDRESS } from '@/constant';

const GasList = [10, 50, 100];

const EthGasList = [50, 100, 500];

export const GasTopUp = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const history = useHistory();

  const [visible, setVisible] = useState(false);

  const [token, setToken] = useState<TokenItem | undefined>();

  const [chain, setChain] = useState(CHAINS_ENUM.ETH);

  const [index, setIndex] = useState(0);

  const { value, loading } = useAsync(async () => {
    const account = await wallet.getCurrentAccount();
    const chainId = CHAINS[chain].serverId;
    const tokenId = CHAINS[chain].nativeTokenAddress;
    return await wallet.openapi.getToken(account!.address, chainId, tokenId);
  }, [chain]);

  const { value: tokenList, loading: tokenListLoading } = useAsync(async () => {
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

  const prices = useMemo(() => {
    if (chain === CHAINS_ENUM.ETH) {
      return EthGasList.map((e) => [
        e,
        new BigNumber(e).div(value?.price || 1).toFixed(2),
      ]);
    }
    return GasList.map((e) => [
      e,
      new BigNumber(e).div(value?.price || 1).toFixed(2),
    ]);
  }, [value, chain]);

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
    if (!tokenListLoading && !tokenList?.[0]) {
      setVisible(false);
      message.error('you have not enough token to pay');
    }
  }, [tokenList, tokenListLoading]);

  // useEffect(() => {
  //   if (tokenList?.[0] && !token) {
  //     setToken(tokenList[0]);
  //   }
  // }, [prices, tokenList, token]);

  const gasTopUp = async () => {
    if (!token) return;

    const sendValue = new BigNumber(prices[index][0])
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
      });
      window.close();
    } catch (error) {
      console.log('error', error);
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
        <div className="text-15 mb-12">{t('Top Up Chain')}</div>
        <ChainSelect value={chain} onChange={setChain} />

        <div className="mt-[40px] mb-[12px]">{t('Amount')}</div>
        <Space size={8}>
          {prices.map((e, i) => (
            <div
              key={e[1]}
              className={clsx(
                'w-[104px] h-[56px] cursor-pointer rounded border  text-center flex flex-col items-center justify-center',
                i === index
                  ? 'bg-blue-light border-blue-light bg-opacity-[0.1]'
                  : 'bg-gray-bg border-transparent hover:border-blue-light'
              )}
              onClick={() => setIndex(i)}
            >
              <div
                className={clsx(
                  'text-15 text-gray-title font-medium ',
                  i === index && 'text-blue-light'
                )}
              >
                ${e[0]}
              </div>
              {loading ? (
                <Skeleton.Input active />
              ) : (
                <div
                  className={clsx(
                    'text-12 text-gray-subTitle mt-2',
                    i === index && 'text-blue-light'
                  )}
                >
                  ≈ ${e[1]} {value?.symbol}
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
        >
          {t('Continue')}
        </Button>
      </div>

      <ConfirmDrawer
        visible={visible}
        onClose={() => setVisible(false)}
        cost={prices[index][0] + ''}
        list={tokenList}
        token={token}
        onChange={setToken}
        onConfirm={gasTopUp}
        loading={tokenListLoading}
      />
    </div>
  );
};

export default GasTopUp;
