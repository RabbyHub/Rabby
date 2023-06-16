import React, { useState, useEffect } from 'react';
import { Spin } from 'ui/component';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { splitNumberByStep, useWallet } from 'ui/utils';
import { CHAINS, KEYRING_TYPE } from 'consts';
import { SvgIconOffline } from 'ui/assets';
import clsx from 'clsx';
import { Skeleton } from 'antd';
import { Chain } from '@debank/common';
import { ChainList } from './ChainList';
import { useCurve } from './useCurve';
import { CurvePoint, CurveThumbnail } from './CurveView';
import ArrowNextSVG from '@/ui/assets/dashboard/arrow-next.svg';

const BalanceView = ({
  currentAccount,
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
  const curveData = useCurve(
    currentAccount?.address,
    accountBalanceUpdateNonce,
    balance
  );
  const wallet = useWallet();
  const [isGnosis, setIsGnosis] = useState(false);
  const [gnosisNetworks, setGnosisNetworks] = useState<Chain[]>([]);
  const [isHover, setHover] = useState(false);
  const [curvePoint, setCurvePoint] = useState<CurvePoint>();

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

  const handleHoverCurve = (data) => {
    setCurvePoint(data);
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

  useEffect(() => {
    if (!isHover) {
      setCurvePoint(undefined);
    }
  }, [isHover]);

  const currentBalance = curvePoint?.value || balance;
  const splitBalance = splitNumberByStep((currentBalance || 0).toFixed(2));
  const currentChangePercent =
    curvePoint?.changePercent || curveData?.changePercent;
  const currentIsLoss = curvePoint ? curvePoint.isLoss : curveData?.isLoss;
  const currentChangeValue = curvePoint?.change || curveData?.change;

  return (
    <div onMouseLeave={() => setHover(false)} className={clsx('assets flex')}>
      <div className="left">
        <div className={clsx('amount mb-0', 'text-32')}>
          <div
            className={clsx(
              'amount-number balance-loading',
              !startAnimate && 'text-32'
            )}
          >
            {(balanceLoading && !balanceFromCache) ||
            currentBalance === null ||
            (balanceFromCache && currentBalance === 0) ? (
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
                title={splitBalance}
              >
                ${splitBalance}
              </span>
            )}
          </div>
          <div
            className={clsx(
              currentIsLoss ? 'text-[#FF6E6E]' : 'text-[#33CE43]',
              'text-15 font-normal',
              {
                hidden: !currentChangePercent,
              }
            )}
          >
            {currentIsLoss ? '-' : '+'}
            {currentChangePercent}({currentChangeValue})
          </div>
        </div>
        <div
          onMouseMove={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className={clsx(
            isHover &&
              'bg-[#00000033] shadow-sm border-[#FFFFFF33] border-[0.5px] mx-10 mb-10',
            'mt-4 rounded-[4px] relative cursor-pointer'
          )}
        >
          {isHover ? (
            <img
              src={ArrowNextSVG}
              className="absolute top-[10px] right-[12px]"
            />
          ) : null}
          <div
            className={clsx(
              'extra flex',
              isHover ? 'mx-[9.5px] pt-[7.5px]' : 'mx-20 pt-8'
            )}
          >
            {currentBalance === null ? (
              <>
                <Spin size="small" iconClassName="text-white" />
                <span className="ml-4 leading-tight">
                  {'Asset data loading'}
                </span>
              </>
            ) : !success ? (
              <>
                <SvgIconOffline className="mr-4" />
                <span className="leading-tight">
                  {'The network is disconnected and no data is obtained'}
                </span>
              </>
            ) : chainBalances.length > 0 ? (
              <div className="flex space-x-4">
                <ChainList
                  isGnosis={isGnosis}
                  chainBalances={chainBalances}
                  gnosisNetworks={gnosisNetworks}
                />
              </div>
            ) : (
              'No assets'
            )}
          </div>
          {curveData && curveData.list.length > 0 ? (
            <div
              className={clsx(
                'h-[88px] w-full relative',
                isHover ? '' : 'mt-10'
              )}
            >
              <CurveThumbnail
                isHover={isHover}
                data={curveData}
                onHover={handleHoverCurve}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default BalanceView;
