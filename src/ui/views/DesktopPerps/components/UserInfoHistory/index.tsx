import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';
import { PositionsInfo } from './PositionsInfo';
import { OrderHistory } from './OrderHistory';
import { TradeHistory } from './TradeHistory';
import { OpenOrders } from './OpenOrders';
import { FundingHistory } from './FundingHistory';
import { Twap } from './Twap';
import { useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';

interface Tab {
  key: string;
  label: string;
  content: React.FC;
  number?: number;
}

export const UserInfoHistory: React.FC = () => {
  const { clearinghouseState, openOrders, twapStates } = useRabbySelector(
    (store) => store.perps
  );
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<typeof tabs[number]['key']>(
    'positions'
  );

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const tabs: Tab[] = useMemo(() => {
    const assetPositionNum = clearinghouseState?.assetPositions?.length || 0;
    const openOrdersNum = openOrders.length;
    const twapNum = twapStates.length;

    return [
      {
        key: 'positions',
        label: t('page.perpsPro.userInfo.tab.positions'),
        content: PositionsInfo,
        number: assetPositionNum,
      },
      {
        key: 'openOrders',
        label: t('page.perpsPro.userInfo.tab.openOrders'),
        content: OpenOrders,
        number: openOrdersNum,
      },
      {
        key: 'twap',
        label: t('page.perpsPro.userInfo.tab.twap'),
        content: Twap,
        number: twapNum,
      },
      {
        key: 'tradeHistory',
        label: t('page.perpsPro.userInfo.tab.tradeHistory'),
        content: TradeHistory,
      },
      {
        key: 'fundingHistory',
        label: t('page.perpsPro.userInfo.tab.fundingHistory'),
        content: FundingHistory,
      },
      {
        key: 'orderHistory',
        label: t('page.perpsPro.userInfo.tab.orderHistory'),
        content: OrderHistory,
      },
    ];
  }, [
    clearinghouseState?.assetPositions?.length,
    openOrders.length,
    twapStates.length,
    activeTab,
  ]);

  const ActiveComponent = useMemo(
    () => tabs.find((tab) => tab.key === activeTab)?.content,
    [activeTab]
  );

  useLayoutEffect(() => {
    const activeButton = tabRefs.current[activeTab];
    const container = tabsContainerRef.current;
    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    const handleTabChange = (tab: typeof tabs[number]['key']) => {
      setActiveTab(tab);
    };
    eventBus.addEventListener(
      EVENTS.PERPS.USER_INFO_HISTORY_TAB_CHANGED,
      handleTabChange
    );
    return () => {
      eventBus.removeEventListener(
        EVENTS.PERPS.USER_INFO_HISTORY_TAB_CHANGED,
        handleTabChange
      );
    };
  }, []);

  return (
    <div className="flex-1 h-full bg-rb-neutral-bg-1 flex flex-col min-w-0 overflow-hidden">
      <div
        ref={tabsContainerRef}
        className="relative flex border-b border-solid border-rb-neutral-line flex-shrink-0"
      >
        {tabs.map((tab) => {
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              className={clsx(
                'px-[16px] py-[16px] text-[14px] flex items-center gap-[4px]',
                activeTab === tab.key
                  ? 'text-r-blue-default'
                  : 'hover:text-r-blue-default text-r-neutral-foot'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              {tab.number ? (
                <div className="h-[16px] px-6 text-[12px] text-rb-brand-default bg-rb-brand-light-1 rounded-[4px] flex items-center justify-center">
                  {tab.number}
                </div>
              ) : null}
            </button>
          );
        })}
        <div
          className="absolute bottom-0 h-[2px] bg-rb-brand-default transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="text-r-neutral-foot text-[12px] whitespace-nowrap h-full">
          {ActiveComponent ? <ActiveComponent /> : null}
        </div>
      </div>
    </div>
  );
};
