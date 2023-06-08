import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Spin } from 'ui/component';

import useCurrentBalance from 'ui/hooks/useCurrentBalance';
import { splitNumberByStep, useWallet } from 'ui/utils';
import { CHAINS, KEYRING_TYPE, CHAINS_ENUM } from 'consts';
import { SvgIconOffline } from 'ui/assets';
import IconChainMore from 'ui/assets/chain-more.svg';
import clsx from 'clsx';
import { Skeleton } from 'antd';
import { Chain } from '@debank/common';

const BalanceView = ({
  currentAccount,
  showChain = false,
  startAnimate = false,
  accountBalanceUpdateNonce = 0,
  onClick,
}) => {
  const [
    balance,
    chainBalances,
    _,
    success,
    balanceLoading,
    balanceFromCache,
  ] = useCurrentBalance(
    currentAccount?.address,
    true,
    false,
    accountBalanceUpdateNonce
  );
  const [numberAnimation, setNumberAnimation] = useState('');
  const [numberWrapperAnimation, setNumberWrapperAnimation] = useState('');

  const { t } = useTranslation();
  const wallet = useWallet();
  const [isGnosis, setIsGnosis] = useState(false);
  const [gnosisNetworks, setGnosisNetworks] = useState<Chain[]>([]);

  const handleIsGnosisChange = async () => {
    if (!currentAccount) return;
    const networkIds = await wallet.getGnosisNetworkIds(currentAccount.address);
    const chains = networkIds
      .map((networkId) => {
        return Object.values(CHAINS).find(
          (chain) => chain.id === Number(networkId)
        );
      })
      .filter((v) => !!v);
    setGnosisNetworks(chains as Chain[]);
  };

  useEffect(() => {
    if (currentAccount) {
      setIsGnosis(currentAccount.type === KEYRING_TYPE.GnosisKeyring);
    }
  }, [currentAccount]);

  useEffect(() => {
    if (isGnosis) {
      handleIsGnosisChange();
    }
  }, [isGnosis, currentAccount]);
  const displayChainList = () => {
    if (isGnosis) {
      if (gnosisNetworks.length === 1) {
        const gnosisNetwork = gnosisNetworks[0];
        return (
          <>
            <img
              src={gnosisNetwork.whiteLogo || gnosisNetwork.logo}
              className="icon icon-chain opacity-60"
            />
            <span className="ml-2 text-white opacity-40">
              On {gnosisNetwork.name}
            </span>
          </>
        );
      } else {
        return (
          <>
            {gnosisNetworks.map((gnosisNetwork) => {
              return (
                <img
                  key={gnosisNetwork.id}
                  src={gnosisNetwork.whiteLogo || gnosisNetwork.logo}
                  className="icon icon-chain opacity-60"
                />
              );
            })}
          </>
        );
      }
    }
    const result = chainBalances
      .sort((a, b) => b.usd_value - a.usd_value)
      .map((item) => (
        <img
          src={item.whiteLogo || item.logo_url}
          className="icon icon-chain opacity-40"
          key={item.id}
          alt={`${item.name}: $${item.usd_value.toFixed(2)}`}
        />
      ));
    if (result.length >= 14) {
      return result
        .slice(0, 14)
        .concat(
          <img src={IconChainMore} className="icon icon-chain" key="more" />
        );
    }
    return result;
  };
  useEffect(() => {
    if (showChain) {
      setNumberAnimation('numberScaleOut');
      setNumberWrapperAnimation('numberWrapperScaleOut');
    } else {
      setNumberAnimation('numberScaleIn');
      setNumberWrapperAnimation('numberWrapperScaleIn');
    }
  }, [showChain]);
  return (
    <div
      className={clsx(
        'assets flex',
        startAnimate ? numberWrapperAnimation : ''
      )}
    >
      <div className="left">
        <div
          className={clsx(
            'amount mb-0',
            startAnimate ? numberAnimation : 'text-32'
          )}
        >
          <div
            className={clsx(
              'amount-number balance-loading',
              !startAnimate && 'text-32'
            )}
          >
            {(balanceLoading && !balanceFromCache) ||
            balance === null ||
            (balanceFromCache && balance === 0) ? (
              <Skeleton.Input
                active
                style={{
                  width: 200,
                  height: 28,
                }}
                className="leading-[28px]"
              />
            ) : (
              <span
                onClick={onClick}
                className={clsx(
                  'cursor-pointer transition-opacity',
                  balanceFromCache && 'opacity-80'
                )}
                title={splitNumberByStep((balance || 0).toFixed(2))}
              >
                ${splitNumberByStep((balance || 0).toFixed(2))}
              </span>
            )}
          </div>
        </div>
        <div
          className={clsx(
            'extra flex h-[20px] mt-4',
            startAnimate ? (showChain ? 'fadeIn' : 'quickFadeOut') : 'hide'
          )}
        >
          {balance === null ? (
            <>
              <Spin size="small" iconClassName="text-white" />
              <span className="ml-4 leading-tight">
                {t('Asset data loading')}
              </span>
            </>
          ) : !success ? (
            <>
              <SvgIconOffline className="mr-4" />
              <span className="leading-tight">
                {t('The network is disconnected and no data is obtained')}
              </span>
            </>
          ) : chainBalances.length > 0 ? (
            <div className="flex">{displayChainList()}</div>
          ) : (
            t('No assets')
          )}
        </div>
      </div>
    </div>
  );
};

export default BalanceView;
