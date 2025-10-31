import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useRabbySelector } from '@/ui/store';
import { splitNumberByStep, useWallet } from '@/ui/utils';
import { findChain, findChainByEnum } from '@/utils/chain';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useAsync } from 'react-use';
import { ReactComponent as RcIconGas } from 'ui/assets/dashboard/gas.svg';
import IconUnknown from 'ui/assets/token-default.svg';

interface Props {
  currentConnectedSiteChain: CHAINS_ENUM;
}

export const GasPriceBar: React.FC<Props> = ({ currentConnectedSiteChain }) => {
  const wallet = useWallet();
  const account = useRabbySelector((state) => state.account.currentAccount);

  const currentConnectedSiteChainNativeToken = useMemo(
    () =>
      currentConnectedSiteChain
        ? findChain({
            enum: currentConnectedSiteChain,
          })?.nativeTokenAddress || 'eth'
        : 'eth',
    [currentConnectedSiteChain]
  );

  const {
    value: gasPrice = 0,
    loading: gasPriceLoading,
  } = useAsync(async () => {
    try {
      const chain = findChain({
        serverId: currentConnectedSiteChainNativeToken,
      });
      const marketGas = chain?.isTestnet
        ? await wallet.getCustomTestnetGasMarket({
            chainId: chain?.id,
          })
        : await wallet.gasMarketV2({
            chainId: currentConnectedSiteChainNativeToken,
          });
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
      className={clsx(
        'rounded-[8px] bg-r-neutral-card-1 px-[12px] py-[8px]',
        'flex items-center justify-between'
      )}
    >
      <div className="flex items-center gap-[6px]">
        {tokenLoading ? (
          <Skeleton.Avatar
            className="bg-transparent"
            size={20}
            active
            shape="circle"
          />
        ) : (
          <img
            src={tokenLogo || IconUnknown}
            className={clsx('rounded-full', 'w-[20px] h-[20px]')}
          />
        )}
        {currentPriceLoading ? (
          <Skeleton.Button className="h-[14px] bg-transparent" active={true} />
        ) : (
          <div className="flex items-center gap-[3px]">
            <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium">
              {currentPrice !== null
                ? currentPrice < 0.01
                  ? '<$0.01'
                  : `$${splitNumberByStep(currentPrice.toFixed(2))}`
                : '-'}
            </div>
            {percentage !== null && (
              <div
                className={clsx(
                  'text-[12px] leading-[14px] font-medium',
                  percentage > 0
                    ? 'text-r-green-default'
                    : percentage === 0
                    ? 'text-r-neutral-body'
                    : 'text-r-red-default'
                )}
              >
                {percentage >= 0 && '+'}
                {percentage?.toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-[4px]">
        <ThemeIcon
          src={RcIconGas}
          className="w-[16px] h-[16px] relative -top-1"
        />
        {gasPriceLoading ? (
          <Skeleton.Button className="h-[14px] bg-transparent" active={true} />
        ) : (
          <>
            <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium">
              {`${splitNumberByStep(gasPrice)}`}
            </div>
            <div className="text-r-neutral-foot text-[12px] leading-[14px] font-medium">
              Gwei
            </div>
          </>
        )}
      </div>
    </div>
  );
};
