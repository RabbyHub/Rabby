import React, { useMemo, useState } from 'react';
import { useRabbySelector } from '@/ui/store';
import { HistoryAccountItem, HistoryItem } from './HistoryItem';
import { Empty } from '@/ui/component';
import { WsFill } from '@rabby-wallet/hyperliquid-sdk';
import { useTranslation } from 'react-i18next';
import { HistoryDetailPopup } from './HistoryDetailPopup';
import { ReactComponent as RcIconNoSrc } from '@/ui/assets/perps/IconNoSrc.svg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { AccountHistoryItem, MarketData } from '@/ui/models/perps';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useHistory } from 'react-router-dom';
import { useMemoizedFn } from 'ahooks';

export const HistoryContent: React.FC<{
  marketData: Record<string, MarketData>;
  historyData: (WsFill | AccountHistoryItem)[];
  coin?: string;
}> = ({ marketData, historyData, coin }) => {
  const { t } = useTranslation();
  const history = useHistory();
  const [selectedFill, setSelectedFill] = useState<
    (WsFill & { logoUrl: string }) | null
  >(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const fillsOrderTpOrSl = useRabbySelector(
    (state) => state.perps.fillsOrderTpOrSl
  );

  const handleItemClick = useMemoizedFn((fill: WsFill) => {
    const obj = {
      ...fill,
      logoUrl: marketData[fill.coin.toUpperCase()]?.logoUrl || '',
    };
    setSelectedFill(obj);
    setDetailVisible(true);
  });

  const handleCloseDetail = () => {
    setDetailVisible(false);
    setSelectedFill(null);
  };

  return (
    <div className="flex-1 mt-20">
      <div className="flex items-center justify-between mb-8">
        <div className="text-13 font-medium text-r-neutral-title-1">
          {t('page.perps.history')}
        </div>
        {historyData.length > 3 ? (
          <div
            className="text-13 text-r-neutral-foot flex items-center cursor-pointer"
            onClick={() => {
              history.push(`/perps/history/${coin}`);
            }}
          >
            {t('page.perps.seeMore')}
            <ThemeIcon
              className="icon icon-arrow-right"
              src={RcIconArrowRight}
            />
          </div>
        ) : (
          <div />
        )}
      </div>

      {historyData.length > 0 ? (
        <div className="overflow-hidden mb-20">
          {historyData
            .slice(0, 3)
            .map((item) =>
              'usdValue' in item ? (
                <HistoryAccountItem data={item} key={item.hash} />
              ) : (
                <HistoryItem
                  fill={item}
                  orderTpOrSl={fillsOrderTpOrSl[item.oid]}
                  onClick={handleItemClick}
                  marketData={marketData}
                  key={item.hash}
                />
              )
            )}
          {/* <Virtuoso
            style={{
              height: '500px',
            }}
            data={historyData}
            itemContent={(_, item) =>
              'usdValue' in item ? (
                <HistoryAccountItem data={item} />
              ) : (
                <HistoryItem
                  fill={item}
                  onClick={handleItemClick}
                  marketData={marketData}
                />
              )
            }
            increaseViewportBy={100}
          /> */}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-8 bg-r-neutral-card1 rounded-[12px] p-20 h-[120px] mb-20 flex-col">
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

export default HistoryContent;
