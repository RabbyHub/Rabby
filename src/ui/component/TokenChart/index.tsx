import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { formatPrice, useWallet } from '@/ui/utils';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import dayjs from 'dayjs';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  formatTokenDateCurve,
  use24hCurveData,
  useDateCurveData,
} from './hooks';
import { REAL_TIME_TAB_LIST, TabKey, TIME_TAB_LIST, TimeTab } from './TimeTab';
import { useRequest } from 'ahooks';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Area, AreaChart, Tooltip, XAxis, YAxis } from 'recharts';
import styled from 'styled-components';
import { Skeleton } from 'antd';

const CurveWrapper = styled.div`
  width: 100%;
  height: 100%;
  z-index: 1;
`;

const DATE_FORMATTER = 'MMM DD, YYYY';

const isRealTimeKey = (key: TabKey) => REAL_TIME_TAB_LIST.includes(key);

const Wrapper = styled.div`
  border-radius: 8px;
  background: var(--r-neutral-card1, #fff);
`;

type TokenChartsProps = {
  token: TokenItem;
  className?: string;
};

export const TokenCharts = ({ token: _token, className }: TokenChartsProps) => {
  const { t } = useTranslation();
  const [priceType, setPriceType] = useState<'price' | 'holding'>('price');
  const [activeKey, setActiveKey] = useState<TabKey>(TIME_TAB_LIST[0].key);

  const [ready, setReady] = useState(false);

  const currentAccount = useCurrentAccount();
  const wallet = useWallet();

  const { data: fetchedToken, loading: tokenLoading } = useRequest(
    async () => {
      return wallet.openapi.getToken(
        currentAccount!.address,
        _token.chain,
        _token.id
      );
    },
    {
      refreshDeps: [_token.chain, _token.id, currentAccount?.address],
    }
  );

  const token = useMemo(() => fetchedToken || _token, [fetchedToken, _token]);

  const amountSum = useMemo(() => {
    return token?.amount || _token.amount || 0;
  }, [token]);

  const amount = useMemo(() => (priceType === 'holding' ? amountSum : 1), [
    priceType,
    amountSum,
  ]);

  const unHold = !amountSum;

  const { data: realTimeData, loading: curveLoading } = use24hCurveData({
    tokenId: _token.id,
    serverId: _token.chain,
    days: activeKey === '24h' ? 1 : 7,
    amount,
  });

  const { data: dateCurveData, loading: timeMachineLoading } = useDateCurveData(
    {
      tokenId: _token.id,
      serverId: _token.chain,
      ready: ready,
    }
  );

  const timeMachMapping = useMemo(() => {
    const result = {} as Record<
      Exclude<TabKey, '24h' | '1W'>,
      ReturnType<typeof formatTokenDateCurve>
    >;
    TIME_TAB_LIST.forEach((e) => {
      if (!isRealTimeKey(e.key) && dateCurveData) {
        result[e.key] = formatTokenDateCurve(
          e.value,
          dateCurveData as any,
          amount
        );
      }
    });
    return result;
  }, [dateCurveData, amount]);

  const data = useMemo(() => {
    if (isRealTimeKey(activeKey)) {
      return realTimeData;
    }
    return timeMachMapping[activeKey as keyof typeof timeMachMapping];
  }, [activeKey, realTimeData, timeMachMapping]);

  const curveIsLoading = useMemo(() => {
    if (isRealTimeKey(activeKey)) {
      return curveLoading;
    }
    return timeMachineLoading;
  }, [activeKey, curveLoading, timeMachineLoading]);

  const { isUp, percent } = useMemo(() => {
    if (data?.list?.length) {
      const pre = data?.list?.[0]?.value;
      const now = data?.list?.[data?.list?.length - 1]?.value;
      const isLoss = now < pre;
      let currentPercent = '';
      if (activeKey === '24h') {
        currentPercent =
          Math.abs((token?.price_24h_change || 0) * 100).toFixed(2) + '%';
      } else {
        currentPercent =
          pre === 0
            ? now === 0
              ? '0%'
              : '100%'
            : Math.abs(((now - pre) / pre) * 100).toFixed(2) + '%';
      }
      return {
        isUp: !isLoss,
        percent: currentPercent,
      };
    }
    return {
      isUp: true,
      percent: '',
    };
  }, [activeKey, data?.list, token?.price_24h_change]);

  const currentInfo = useMemo(() => {
    const price =
      priceType === 'holding' ? token.price * amountSum : token.price;
    return {
      date: dayjs().format(DATE_FORMATTER),
      netWorth: '$' + formatPrice(price || 0, 8),
      isLoss: !!data?.isLoss,
      changePercent: percent,
    };
  }, [data?.isLoss, percent, token?.price, amountSum, priceType]);

  const headerTab: { label: string; key: typeof priceType }[] = useMemo(() => {
    if (token.amount < 0) {
      return [
        {
          label: t('component.TokenChart.price'),
          key: 'price',
        },
      ];
    }
    return [
      {
        label: 'Price',
        key: 'price',
      },
      {
        label: t('component.TokenChart.holding'),
        key: 'holding',
      },
    ];
  }, [token.amount]);

  const color = useMemo(() => {
    return isUp ? '#2ABB7F' : 'var(--r-red-default, #E34935)';
  }, [isUp]);

  const [curveHoverPoint, setHoverCurvePoint] = useState<
    typeof data['list'][number]
  >();

  const handleHoverCurve = (data) => {
    setHoverCurvePoint(data);
  };

  const onSelectActiveKey = useCallback((v: TabKey) => {
    setActiveKey(v);
    if (v !== '24h') {
      setReady(true);
    }
  }, []);

  const isEmpty = !data;

  const displayItem = useMemo(() => {
    return curveHoverPoint || currentInfo;
  }, [curveHoverPoint, currentInfo]);

  const pl = 'pl-16';

  const divRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(92);

  useEffect(() => {
    if (divRef.current) {
      setHeight(divRef.current.clientHeight);
    }
  }, []);

  return (
    <Wrapper className={className}>
      {!unHold && (
        <div
          className={clsx(
            'flex items-center gap-16 h-32 relative pt-8',
            'text-r-neutral-foot text-13 font-medium',
            pl
          )}
        >
          {tokenLoading && (
            <Skeleton.Input active style={{ width: 150, height: 32 }} />
          )}

          {!tokenLoading &&
            headerTab.map((e) => (
              <div
                key={e.key}
                className={clsx(
                  'pb-6 cursor-pointer',
                  'hover:text-r-blue-default',
                  'border-b-[2px] border-solid ',
                  priceType === e.key
                    ? 'text-r-blue-default border-rabby-blue-default'
                    : 'border-transparent'
                )}
                onClick={() => {
                  setPriceType(e.key);
                }}
              >
                {e.label}
              </div>
            ))}
          <div className="absolute w-full h-[0.5px] -bottom-2 left-0 bg-rabby-neutral-line" />
        </div>
      )}

      <div className={clsx('flex gap-6 items-end mb-6 mt-12', pl)}>
        {curveLoading ? (
          <Skeleton.Input active style={{ width: 260, height: 29 }} />
        ) : (
          <>
            <span className="text-24 font-medium text-r-neutral-title1">
              {displayItem.netWorth}
            </span>
            <div
              className={clsx(
                'text-[15px] font-medium',
                displayItem?.isLoss
                  ? 'text-r-red-default'
                  : 'text-r-green-default'
              )}
            >
              {unHold ? '' : displayItem?.isLoss ? '-' : '+'}
              {displayItem.changePercent}
              {curveHoverPoint ? `(${curveHoverPoint?.change})` : ''}
            </div>
          </>
        )}
      </div>
      <div className="h-80">
        <CurveWrapper ref={divRef}>
          {curveIsLoading ? (
            <Skeleton.Input active style={{ width: 360, height: 80 }} />
          ) : isEmpty ? null : (
            <AreaChart
              data={data?.list}
              width={360}
              height={80}
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
              onMouseMove={(val) => {
                if (val?.activePayload) {
                  handleHoverCurve(val.activePayload[0].payload);
                }
              }}
              onMouseLeave={() => handleHoverCurve(undefined)}
            >
              <defs>
                <linearGradient id="curveThumbnail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.19} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                hide
                type="number"
                domain={['dataMin', 'dataMax']}
              />
              <YAxis
                hide
                domain={[
                  (dataMin) => dataMin * 0.98,
                  (dataMax) => dataMax * 1.005,
                ]}
              />
              {
                <Tooltip
                  cursor={{
                    strokeDasharray: '2 2',
                    strokeWidth: 0.6,
                  }}
                  content={({ label }) => {
                    return (
                      <div className="text-r-neutral-foot text-13 font-medium">
                        {getFormatDate(label, activeKey)}
                      </div>
                    );
                  }}
                />
              }
              <Area
                type="linear"
                dataKey="value"
                stroke={color}
                strokeOpacity={1}
                strokeWidth={2}
                fill="url(#curveThumbnail)"
                animationDuration={0}
                fillOpacity={0.8}
              />
            </AreaChart>
          )}
        </CurveWrapper>
      </div>
      <div className="m-16 mt-6">
        <TimeTab activeKey={activeKey} onSelect={onSelectActiveKey} />
      </div>
    </Wrapper>
  );
};

function getFormatDate(value: number, activeKey: TabKey) {
  const date = new Date(value);
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const DD = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (activeKey === '24h' || activeKey === '1W') {
    return `${MM} ${DD}, ${HH}:${mm}`;
  }
  return `${MM} ${DD}, ${YYYY}`;
}
