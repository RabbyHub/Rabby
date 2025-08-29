import React, { useMemo, useState } from 'react';
import { useRabbySelector } from '@/ui/store';
import { HistoryAccountItem, HistoryItem } from './HistoryItem';
import { Empty, PageHeader } from '@/ui/component';
import { WsFill } from '@rabby-wallet/hyperliquid-sdk';
import { Virtuoso } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';
import { HistoryDetailPopup } from './HistoryDetailPopup';
import { ReactComponent as RcIconNoSrc } from '@/ui/assets/perps/IconNoSrc.svg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { AccountHistoryItem, MarketData } from '@/ui/models/perps';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useHistory, useParams } from 'react-router-dom';
import { useMemoizedFn } from 'ahooks';

export const HistoryPage: React.FC = () => {
  const { coin } = useParams<{ coin: string }>();
  const {
    marketDataMap,
    userFills,
    localLoadingHistory,
    userAccountHistory,
    fillsOrderTpOrSl,
  } = useRabbySelector((state) => state.perps);

  const homeHistoryList = useMemo(() => {
    const list = [...localLoadingHistory, ...userAccountHistory, ...userFills];

    return list.sort((a, b) => b.time - a.time);
  }, [userAccountHistory, userFills, localLoadingHistory]);
  console.log('coin', coin);
  const coinHistoryList = useMemo(() => {
    return userFills.filter((item) => item.coin === coin);
  }, [coin, userFills]);

  const { t } = useTranslation();
  const [selectedFill, setSelectedFill] = useState<
    (WsFill & { logoUrl: string }) | null
  >(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const handleItemClick = useMemoizedFn((fill: WsFill) => {
    const obj = {
      ...fill,
      logoUrl: marketDataMap[fill.coin.toUpperCase()]?.logoUrl || '',
    };
    setSelectedFill(obj);
    setDetailVisible(true);
  });

  const handleCloseDetail = () => {
    setDetailVisible(false);
    setSelectedFill(null);
  };

  console.log('homeHistoryList', homeHistoryList, Boolean(coin));
  const list = coin && coin !== 'undefined' ? coinHistoryList : homeHistoryList;

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader className="mx-[20px] pt-[20px]" forceShowBack>
        {t('page.perps.history')}
      </PageHeader>

      {list.length > 0 ? (
        <div className="flex-1 overflow-auto mx-20">
          {list.map((item) =>
            'usdValue' in item ? (
              <HistoryAccountItem data={item} key={item.hash} />
            ) : (
              <HistoryItem
                fill={item}
                orderTpOrSl={fillsOrderTpOrSl[item.oid]}
                onClick={handleItemClick}
                marketData={marketDataMap}
                key={item.hash}
              />
            )
          )}
        </div>
      ) : (
        <div className="flex mx-20 items-center justify-center gap-8 bg-r-neutral-card1 rounded-[12px] p-20 h-[120px] mb-20 flex-col">
          <ThemeIcon src={RcIconNoSrc} className="w-24 h-24" />
          <div className="text-13 text-r-neutral-foot">
            {t('page.gasAccount.history.noHistory')}
          </div>
        </div>
      )}

      <HistoryDetailPopup
        visible={detailVisible}
        orderTpOrSl={
          selectedFill?.oid && fillsOrderTpOrSl[selectedFill.oid]
            ? fillsOrderTpOrSl[selectedFill.oid]
            : undefined
        }
        fill={selectedFill}
        onCancel={handleCloseDetail}
      />
    </div>
  );
};

export default HistoryPage;
