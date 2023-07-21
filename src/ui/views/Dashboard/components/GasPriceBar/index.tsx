import { useRabbySelector } from '@/ui/store';
import { splitNumberByStep, useWallet } from '@/ui/utils';
import { findChainByEnum } from '@/utils/chain';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useAsync } from 'react-use';
import IconGas from 'ui/assets/dashboard/gas.svg';

interface Props {
  currentConnectedSiteChain: CHAINS_ENUM;
}

export const GasPriceBar: React.FC<Props> = ({ currentConnectedSiteChain }) => {
  const wallet = useWallet();
  const account = useRabbySelector((state) => state.account.currentAccount);

  const currentConnectedSiteChainNativeToken = useMemo(
    () =>
      currentConnectedSiteChain
        ? CHAINS?.[currentConnectedSiteChain]?.nativeTokenAddress || 'eth'
        : 'eth',
    [currentConnectedSiteChain]
  );

  const {
    value: gasPrice = 0,
    loading: gasPriceLoading,
  } = useAsync(async () => {
    try {
      const marketGas = await wallet.openapi.gasMarket(
        currentConnectedSiteChainNativeToken
      );
      const selectedGasPice = marketGas.find((item) => item.level === 'slow')
        ?.price;
      if (selectedGasPice) {
        return Number(selectedGasPice / 1e9);
      }
    } catch (e) {
      // DO NOTHING
    }
  }, [currentConnectedSiteChainNativeToken]);

  const { value: tokenLogo, loading: tokenLoading } = useAsync(async () => {
    const chainItem = findChainByEnum(currentConnectedSiteChain, {
      fallback: true,
    })!;

    try {
      const data = await wallet.openapi.getToken(
        account!.address,
        chainItem.serverId || '',
        chainItem.nativeTokenAddress || ''
      );
      return data?.logo_url || chainItem.nativeTokenLogo;
    } catch (error) {
      return chainItem.nativeTokenLogo;
    }
  }, [currentConnectedSiteChain]);

  const {
    value: tokenPrice,
    loading: currentPriceLoading,
  } = useAsync(async () => {
    try {
      const {
        change_percent = 0,
        last_price = 0,
      } = await wallet.openapi.tokenPrice(currentConnectedSiteChainNativeToken);

      return { currentPrice: last_price, percentage: change_percent };
    } catch (e) {
      return {
        currentPrice: null,
        percentage: null,
      };
    }
  }, [currentConnectedSiteChainNativeToken]);

  const { currentPrice = null, percentage = null } = tokenPrice || {};
  const isETH = currentConnectedSiteChainNativeToken === 'eth';

  return (
    <div
      className={clsx('price-viewer h-32', {
        'px-[17px] py-[7px]': isETH,
        'px-[18px] py-[8px]': !isETH,
      })}
    >
      <div className="eth-price">
        {tokenLoading ? (
          <Skeleton.Avatar size={18} active shape="circle" />
        ) : (
          <img
            src={tokenLogo}
            className={clsx('rounded-full', {
              'w-[18px] h-[18px]': isETH,
              'w-[16px] h-[16px]': !isETH,
            })}
          />
        )}
        {currentPriceLoading ? (
          <Skeleton.Button className="h-[14px]" active={true} />
        ) : (
          <>
            <div className="gasprice">
              {currentPrice !== null
                ? currentPrice < 0.01
                  ? '<$0.01'
                  : `$${splitNumberByStep(currentPrice.toFixed(2))}`
                : '-'}
            </div>
            {percentage !== null && (
              <div
                className={
                  percentage > 0
                    ? 'positive'
                    : percentage === 0
                    ? 'even'
                    : 'depositive'
                }
              >
                {percentage >= 0 && '+'}
                {percentage?.toFixed(2)}%
              </div>
            )}
          </>
        )}
      </div>
      <div className="gas-container">
        <img src={IconGas} className="w-[16px] h-[16px] relative -top-1" />
        {gasPriceLoading ? (
          <Skeleton.Button className="h-[14px]" active={true} />
        ) : (
          <>
            <div className="gasprice">{`${splitNumberByStep(gasPrice)}`}</div>
            <div className="gwei">Gwei</div>
          </>
        )}
      </div>
    </div>
  );
};
