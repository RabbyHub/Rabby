import React, { useState, useEffect } from 'react';
import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { useCommonPopupView, useWallet } from 'ui/utils';
import { CHAINS, KEYRING_TYPE } from 'consts';
import { SvgIconOffline } from '@/ui/assets';
import clsx from 'clsx';
import { Skeleton } from 'antd';
import { Chain } from '@debank/common';
import { ChainList } from './ChainList';
import { useCurve } from './useCurve';
import { CurvePoint, CurveThumbnail } from './CurveView';
import ArrowNextSVG from '@/ui/assets/dashboard/arrow-next.svg';
import { ReactComponent as UpdateSVG } from '@/ui/assets/dashboard/update.svg';
import { ReactComponent as WarningSVG } from '@/ui/assets/dashboard/warning-1.svg';
import { useDebounce } from 'react-use';
import { useRabbySelector } from '@/ui/store';
import { BalanceLabel } from './BalanceLabel';
import { useTranslation } from 'react-i18next';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const BalanceView = ({ currentAccount, accountBalanceUpdateNonce = 0 }) => {
  const { t } = useTranslation();
  const isShowTestnet = useRabbySelector(
    (state) => state.preference.isShowTestnet
  );
  const [
    balance,
    matteredChainBalances,
    _,
    success,
    balanceLoading,
    balanceFromCache,
    refreshBalance,
    hasValueChainBalances,
    testnetBalance,
    testnetMatteredChainBalances,
    _1,
    testnetSuccess,
    testnetBalanceLoading,
    _2,
    hasTestnetValueChainBalances,
    missingList,
  ] = useCurrentBalance(
    currentAccount?.address,
    true,
    false,
    accountBalanceUpdateNonce,
    isShowTestnet
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

  const onRefresh = async () => {
    setStartRefresh(true);
    try {
      await Promise.all([refreshBalance(), refreshCurve()]);
    } catch (e) {
      console.error(e);
    } finally {
      setStartRefresh(false);
    }
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
        matteredChainBalances: hasValueChainBalances,
        balance,
        balanceLoading,
        isEmptyAssets: !matteredChainBalances.length,
        isOffline: !success,
        testnetBalance,
        testnetBalanceLoading,
        testnetIsEmptyAssets: !testnetMatteredChainBalances.length,
        isTestnetOffline: !testnetSuccess,
        matteredTestnetChainBalances: hasTestnetValueChainBalances,
      });
    }
  }, [
    matteredChainBalances,
    testnetMatteredChainBalances,
    hasTestnetValueChainBalances,
    testnetBalance,
    testnetSuccess,
    testnetBalanceLoading,
    balance,
    balanceLoading,
    componentName,
    hasValueChainBalances,
  ]);

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
  const currentChangePercent = currentHover
    ? curvePoint?.changePercent || curveData?.changePercent
    : curveData?.changePercent;
  const currentIsLoss =
    currentHover && curvePoint ? curvePoint.isLoss : curveData?.isLoss;
  const currentChangeValue = currentHover ? curvePoint?.change : null;
  const { hiddenBalance } = useRabbySelector((state) => state.preference);

  return (
    <div onMouseLeave={onMouseLeave} className={clsx('assets flex')}>
      <div className="left relative overflow-x-hidden mx-10">
        <div className={clsx('amount group', 'text-32 mt-6')}>
          <div className={clsx('amount-number leading-[38px]')}>
            {startRefresh ||
            (balanceLoading && !balanceFromCache) ||
            currentBalance === null ||
            (balanceFromCache && currentBalance === 0) ? (
              <Skeleton.Input active className="w-[200px] h-[38px] rounded" />
            ) : (
              <BalanceLabel
                isCache={balanceFromCache}
                balance={currentBalance}
              />
            )}
          </div>
          <div
            onClick={onRefresh}
            className={clsx(
              currentIsLoss ? 'text-[#FF6E6E]' : 'text-[#33CE43]',
              'text-15 font-normal mb-[5px]',
              {
                hidden:
                  !currentChangePercent || balanceLoading || hiddenBalance,
              }
            )}
          >
            {currentIsLoss ? '-' : '+'}
            <span>{currentChangePercent}</span>
            {currentChangeValue ? (
              <span className="ml-4">({currentChangeValue})</span>
            ) : null}
          </div>
          {missingList?.length ? (
            <TooltipWithMagnetArrow
              overlayClassName="rectangle font-normal whitespace-pre-wrap"
              title={t('page.dashboard.home.missingDataTooltip', {
                text:
                  missingList.join(t('page.dashboard.home.chain')) +
                  t('page.dashboard.home.chainEnd'),
              })}
            >
              <div className={clsx('mb-[6px]')}>
                <WarningSVG />
              </div>
            </TooltipWithMagnetArrow>
          ) : null}
          <div
            onClick={onRefresh}
            className={clsx('mb-[5px]', {
              'block animate-spin': startRefresh,
              hidden: !startRefresh,
              'group-hover:block': !hiddenBalance,
            })}
          >
            <UpdateSVG />
          </div>
        </div>
        <div
          onClick={onClickViewAssets}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className={clsx(
            'mt-[4px] mb-10',
            currentHover && 'bg-[#000] bg-opacity-10',
            'rounded-[4px] relative cursor-pointer',
            'overflow-hidden'
          )}
        >
          <img
            src={ArrowNextSVG}
            className={clsx(
              'absolute w-[20px] h-[20px] top-[8px] right-[10px]',
              !currentHover && 'opacity-80'
            )}
          />
          <div
            className={clsx(
              'extra flex h-[28px]',
              'mx-[10px] pt-[8px] mb-[8px]'
            )}
          >
            {startRefresh || balanceLoading || currentBalance === null ? (
              <>
                <Skeleton.Input active className="w-[130px] h-[20px] rounded" />
              </>
            ) : !success ? (
              <>
                <SvgIconOffline className="mr-4 text-white" />
                <span className="leading-tight">
                  {t('page.dashboard.home.offline')}
                </span>
              </>
            ) : hasValueChainBalances.length > 0 ? (
              <div
                className={clsx(
                  'flex space-x-4',
                  !currentHover && 'opacity-80'
                )}
              >
                <ChainList
                  isGnosis={isGnosis}
                  matteredChainBalances={hasValueChainBalances}
                  gnosisNetworks={gnosisNetworks}
                />
              </div>
            ) : null}
          </div>
          <div className={clsx('h-[80px] w-full relative')}>
            {(!success && !curveData) || hiddenBalance ? null : curveLoading ? (
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
