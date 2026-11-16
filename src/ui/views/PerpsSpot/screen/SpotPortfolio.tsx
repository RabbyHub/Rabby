import React, { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { Button, Modal } from 'antd';
import { useMemoizedFn } from 'ahooks';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/ui/component';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { usePerpsState } from '@/ui/views/Perps/hooks/usePerpsState';
import { PerpsLoading } from '@/ui/views/Perps/components/Loading';
import { PerpsBlueBorderedButton } from '@/ui/views/Perps/components/BlueBorderedButton';
import { SpotTokenLogo } from '../components/SpotTokenLogo';
import { SpotOpenOrderRow } from '../components/SpotOpenOrderRow';
import { SpotOrderHistoryRow } from '../components/SpotOrderHistoryRow';
import { usePerpsSpotData } from '../hooks/usePerpsSpotData';
import { useSpotActions } from '../hooks/useSpotActions';
import { useSpotOrderCancel } from '../hooks/useSpotOrderCancel';
import { useSpotOrderHistory } from '../hooks/useSpotOrderHistory';
import {
  buildSpotBalanceItems,
  buildSpotOpenOrderItems,
  formatSpotPrice,
  getSpotMarketDisplayName,
  getSpotPortfolioValue,
  groupSpotOpenOrders,
} from '../utils/spotMarkets';
import { perpsSpotPaths } from '../navigation';

type PortfolioTab = 'balances' | 'orders' | 'history';

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="pt-40 text-center text-13 text-r-neutral-foot">
    {children}
  </div>
);

export const PerpsSpotPortfolio: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { isDarkTheme } = useThemeMode();
  const { hasPermission } = usePerpsState({});
  const { markets, account, currentPerpsAccount, refresh } = usePerpsSpotData({
    withAccount: true,
  });
  const { cancelAllSpotOrders } = useSpotActions();
  const { cancel, cancellingOid } = useSpotOrderCancel(refresh);
  const [tab, setTab] = useState<PortfolioTab>('orders');
  const [cancellingAll, setCancellingAll] = useState(false);
  const cancelAllLockRef = useRef(false);

  const orderItems = useMemo(
    () => buildSpotOpenOrderItems(account?.openOrders, markets),
    [account, markets]
  );
  const orderGroups = useMemo(() => groupSpotOpenOrders(orderItems), [
    orderItems,
  ]);
  const balanceItems = useMemo(
    () => buildSpotBalanceItems(account?.balances, markets),
    [account, markets]
  );
  const portfolioValue = useMemo(() => getSpotPortfolioValue(balanceItems), [
    balanceItems,
  ]);
  const historyState = useSpotOrderHistory({
    address: currentPerpsAccount?.address,
    markets,
    enabled: tab === 'history' && markets.length > 0,
  });

  const runCancelAll = useMemoizedFn(async () => {
    if (cancelAllLockRef.current) {
      return;
    }
    cancelAllLockRef.current = true;
    setCancellingAll(true);
    try {
      await cancelAllSpotOrders(
        orderItems.map((item) => ({
          pairIndex: item.market.pairIndex,
          oid: item.order.oid,
        }))
      );
    } finally {
      // A partial failure still cancelled some orders.
      refresh();
      cancelAllLockRef.current = false;
      setCancellingAll(false);
    }
  });

  const handleCancelAll = useMemoizedFn(() => {
    const modal = Modal.info({
      width: 360,
      closable: false,
      maskClosable: true,
      centered: true,
      title: null,
      className: clsx(
        'perps-bridge-swap-modal perps-close-all-position-modal',
        isDarkTheme
          ? 'perps-bridge-swap-modal-dark'
          : 'perps-bridge-swap-modal-light'
      ),
      bodyStyle: { padding: 0 },
      content: (
        <div className="flex items-center justify-center flex-col gap-12 bg-r-neutral-bg2 rounded-lg px-[16px] pt-[20px] pb-[24px]">
          <div className="text-[17px] font-bold text-r-neutral-title-1 text-center">
            {t('page.perps.cancelAllOrdersPopup.cancelAllOrdersConfirmTitle')}
          </div>
          <div className="text-15 font-medium text-r-neutral-title-1 text-center">
            {t('page.perpsSpot.cancelAllConfirmMessage')}
          </div>
          <div className="flex items-center justify-center w-full gap-12 mt-20">
            <PerpsBlueBorderedButton block onClick={() => modal.destroy()}>
              {t('page.manageAddress.cancel')}
            </PerpsBlueBorderedButton>
            <Button
              size="large"
              block
              type="primary"
              onClick={() => {
                modal.destroy();
                runCancelAll();
              }}
            >
              {t('page.manageAddress.confirm')}
            </Button>
          </div>
        </div>
      ),
    });
  });

  const renderOrders = () => {
    if (!orderGroups.length) {
      return <Empty>{t('page.perpsSpot.noOpenOrders')}</Empty>;
    }
    return (
      <div className="flex flex-col gap-16">
        {orderGroups.map((group) => (
          <div key={group.market.coin} className="flex flex-col gap-8">
            <div
              className="flex items-center gap-8 cursor-pointer"
              onClick={() =>
                history.push(perpsSpotPaths.trade(group.market.pairIndex))
              }
            >
              <SpotTokenLogo baseName={group.market.baseName} size={20} />
              <span className="text-13 font-medium text-r-neutral-title-1">
                {getSpotMarketDisplayName(group.market)}
              </span>
              <span className="text-12 text-r-neutral-foot">
                {t('page.perpsSpot.midLabel', {
                  price: group.market.midPx
                    ? formatSpotPrice(
                        group.market.midPx,
                        group.market.szDecimals
                      )
                    : '-',
                })}
              </span>
            </div>
            {group.orders.map((order) => (
              <SpotOpenOrderRow
                key={order.oid}
                order={order}
                market={group.market}
                cancelling={cancellingOid === order.oid}
                cancelDisabled={
                  cancellingOid !== null || cancellingAll || !hasPermission
                }
                onCancel={cancel}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderBalances = () => {
    if (!balanceItems.length) {
      return <Empty>{t('page.perpsSpot.noBalances')}</Empty>;
    }
    return (
      <div className="flex flex-col gap-8">
        {balanceItems.map(({ balance, market, usdValue }) => {
          const hold = new BigNumber(balance.hold || 0);
          const available = BigNumber.max(
            new BigNumber(balance.total || 0).minus(hold),
            0
          );
          const decimals = market ? market.szDecimals : 2;
          return (
            <div
              key={balance.token}
              className="flex items-center gap-12 px-12 py-12 rounded-[8px] bg-r-neutral-card1"
            >
              <SpotTokenLogo baseName={balance.coin} size={32} />
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <span className="text-15 font-medium text-r-neutral-title-1">
                  {balance.coin}
                </span>
                <span className="text-12 text-r-neutral-foot truncate">
                  {usdValue ? `≈ $${new BigNumber(usdValue).toFixed(2)}` : '-'}
                  {hold.gt(0)
                    ? ` · ${t('page.perpsSpot.lockedInOrders', {
                        amount: hold.toFixed(),
                      })}`
                    : ''}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-15 font-medium text-r-neutral-title-1">
                  {new BigNumber(balance.total).toFixed(
                    decimals,
                    BigNumber.ROUND_DOWN
                  )}
                </span>
                {market ? (
                  <span
                    className="text-12 font-medium text-r-red-default cursor-pointer"
                    onClick={() =>
                      history.push(
                        perpsSpotPaths.trade(market.pairIndex, 'sell')
                      )
                    }
                  >
                    {t('page.perpsSpot.sell')}
                  </span>
                ) : (
                  <span className="text-12 text-r-neutral-foot">
                    {t('page.perpsSpot.availableAmount', {
                      amount: available.toFixed(2, BigNumber.ROUND_DOWN),
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderHistory = () => {
    if (historyState.isError) {
      return <Empty>{t('page.perpsSpot.historyLoadError')}</Empty>;
    }
    if (historyState.isLoading) {
      return <PerpsLoading />;
    }
    if (!historyState.items.length) {
      return <Empty>{t('page.perpsSpot.noHistory')}</Empty>;
    }
    return (
      <div className="flex flex-col gap-8">
        {historyState.items.map((item) => (
          <SpotOrderHistoryRow
            key={item.oid}
            item={item}
            onClick={(row) =>
              history.push(perpsSpotPaths.trade(row.market.pairIndex))
            }
          />
        ))}
      </div>
    );
  };

  const tabs: { value: PortfolioTab; label: string }[] = [
    { value: 'balances', label: t('page.perpsSpot.tabBalances') },
    {
      value: 'orders',
      label: t('page.perpsSpot.tabOrders', { count: orderItems.length }),
    },
    { value: 'history', label: t('page.perpsSpot.tabHistory') },
  ];

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader className="mx-[20px] pt-[20px]" forceShowBack>
        {t('page.perpsSpot.portfolioTitle')}
      </PageHeader>

      {!currentPerpsAccount ? (
        <Empty>{t('page.perpsSpot.loginRequired')}</Empty>
      ) : !account || !markets.length ? (
        <PerpsLoading />
      ) : (
        <div className="flex-1 overflow-auto px-20 pb-20">
          <div className="px-16 py-16 rounded-[8px] bg-r-neutral-card1">
            <div className="text-13 text-r-neutral-foot">
              {t('page.perpsSpot.spotValue')}
            </div>
            <div className="mt-4 text-[24px] leading-[28px] font-bold text-r-neutral-title-1">
              ${new BigNumber(portfolioValue).toFixed(2)}
            </div>
          </div>

          <div className="mt-16 flex items-center justify-between">
            <div className="flex items-center gap-16">
              {tabs.map((item) => (
                <div
                  key={item.value}
                  className={clsx(
                    'text-15 font-medium cursor-pointer pb-4 border-b-2 border-solid',
                    tab === item.value
                      ? 'text-r-neutral-title-1 border-rabby-blue-default'
                      : 'text-r-neutral-foot border-transparent'
                  )}
                  onClick={() => setTab(item.value)}
                >
                  {item.label}
                </div>
              ))}
            </div>
            {tab === 'orders' && orderItems.length ? (
              <Button
                size="small"
                loading={cancellingAll}
                disabled={
                  cancellingAll || cancellingOid !== null || !hasPermission
                }
                onClick={handleCancelAll}
              >
                {t('page.perpsSpot.cancelAll')}
              </Button>
            ) : null}
            {tab === 'history' ? (
              <span
                className={clsx(
                  'text-13 font-medium text-r-neutral-foot cursor-pointer hover:text-r-blue-default',
                  historyState.isRefreshing && 'opacity-50'
                )}
                onClick={() => historyState.reload()}
              >
                {t('page.perpsSpot.refresh')}
              </span>
            ) : null}
          </div>

          <div className="mt-12">
            {tab === 'orders'
              ? renderOrders()
              : tab === 'balances'
              ? renderBalances()
              : renderHistory()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerpsSpotPortfolio;
