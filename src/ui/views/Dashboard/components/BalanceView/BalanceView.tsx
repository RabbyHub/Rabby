import React, { useState, useEffect } from 'react';
import { Spin } from 'ui/component';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { splitNumberByStep, useCommonPopupView, useWallet } from 'ui/utils';
import { CHAINS, KEYRING_TYPE } from 'consts';
import { SvgIconOffline } from 'ui/assets';
import clsx from 'clsx';
import { Skeleton } from 'antd';
import { Chain } from '@debank/common';
import { ChainList } from './ChainList';
import { useCurve } from './useCurve';
import { CurvePoint, CurveThumbnail } from './CurveView';
import ArrowNextSVG from '@/ui/assets/dashboard/arrow-next.svg';
import { ReactComponent as UpdateSVG } from '@/ui/assets/dashboard/update.svg';
import { useDebounce } from 'react-use';

const BalanceView = ({ currentAccount, accountBalanceUpdateNonce = 0 }) => {
  const [
    balance,
    chainBalances,
    _,
    success,
    balanceLoading,
    balanceFromCache,
    refreshBalance,
  ] = useCurrentBalance(
    currentAccount?.address,
    true,
    false,
    accountBalanceUpdateNonce
  );
  const {
    result: curveData,
    refresh: refreshCurve,
    isLoading: curveLoading,
  } = useCurve(currentAccount?.address, accountBalanceUpdateNonce, balance);
  const wallet = useWallet();
  const [isGnosis, setIsGnosis] = useState(false);
  const [gnosisNetworks, setGnosisNetworks] = useState<Chain[]>([]);
  const [isHover, setHover] = useState(false);
  const [curvePoint, setCurvePoint] = useState<CurvePoint>();
  const [startRefresh, setStartRefresh] = useState(false);
  const [isDebounceHover, setIsDebounceHover] = useState(false);

  const onRefresh = () => {
    setStartRefresh(true);
    refreshBalance();
    refreshCurve();
  };

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

  const { activePopup, setData, componentName } = useCommonPopupView();
  const onClickViewAssets = () => {
    activePopup('AssetList');
  };

  useEffect(() => {
    if (componentName === 'AssetList') {
      setData({
        chainBalances,
        balance,
        balanceLoading,
      });
    }
  }, [chainBalances, balance, balanceLoading, componentName]);

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

  useEffect(() => {
    if (!balanceLoading && !curveLoading) {
      setStartRefresh(false);
    }
  }, [balanceLoading, curveLoading]);

  const onMouseMove = () => {
    setHover(true);
  };
  const onMouseLeave = () => {
    setHover(false);
    setIsDebounceHover(false);
  };

  useDebounce(
    () => {
      if (isHover) {
        setIsDebounceHover(true);
      }
    },
    300,
    [isHover]
  );

  const currentHover = isDebounceHover;
  const currentBalance = currentHover ? curvePoint?.value || balance : balance;
  const splitBalance = splitNumberByStep((currentBalance || 0).toFixed(2));
  const currentChangePercent = currentHover
    ? curvePoint?.changePercent || curveData?.changePercent
    : curveData?.changePercent;
  const currentIsLoss = curvePoint ? curvePoint.isLoss : curveData?.isLoss;
  const currentChangeValue = currentHover ? curvePoint?.change : null;

  return (
    <div onMouseLeave={onMouseLeave} className={clsx('assets flex')}>
      <div className="left">
        <div onClick={onRefresh} className={clsx('amount group', 'text-32')}>
          <div className={clsx('amount-number leading-[38px]')}>
            {startRefresh ||
            (balanceLoading && !balanceFromCache) ||
            currentBalance === null ||
            (balanceFromCache && currentBalance === 0) ? (
              <Skeleton.Input active className="w-[200px] h-[38px] rounded" />
            ) : (
              <span
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
            className={clsx('hidden mb-6', {
              'group-hover:block': !balanceLoading,
            })}
          >
            <UpdateSVG />
          </div>
          <div
            className={clsx(
              currentIsLoss ? 'text-[#FF6E6E]' : 'text-[#33CE43]',
              'text-15 font-normal mb-[5px]',
              'group-hover:hidden',
              {
                hidden: !currentChangePercent || balanceLoading,
              }
            )}
          >
            {currentIsLoss ? '-' : '+'}
            <span>{currentChangePercent}</span>
            {currentChangeValue ? <span>({currentChangeValue})</span> : null}
          </div>
        </div>
        <div
          onClick={onClickViewAssets}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className={clsx(
            'mt-2',
            currentHover && 'bg-[#00000033] card mx-10 mb-10',
            'rounded-[4px] relative cursor-pointer'
          )}
        >
          {currentHover ? (
            <img
              src={ArrowNextSVG}
              className="absolute top-[10px] right-[12px]"
            />
          ) : null}
          <div
            className={clsx(
              'extra flex',
              currentHover ? 'mx-[10px] pt-[8px]' : 'mx-20 pt-8'
            )}
          >
            {startRefresh || currentBalance === null ? (
              <>
                <Skeleton.Input active className="w-[130px] h-[20px] rounded" />
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

          <div
            className={clsx(
              'h-[88px] w-full relative',
              currentHover ? '' : 'mt-10'
            )}
          >
            {curveLoading ? (
              <div className="flex mt-[14px]">
                <Skeleton.Input
                  active
                  className="m-auto w-[360px] h-[72px] rounded"
                />
              </div>
            ) : (
              <CurveThumbnail
                isHover={currentHover}
                data={curveData}
                onHover={handleHoverCurve}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceView;
