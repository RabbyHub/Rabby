import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import {
  formatPrice,
  formatTokenAmount,
  formatUsdValue,
} from 'ui/utils/number';
import {
  use24hCurveData,
  useDateCurveData,
  formatTokenDateCurve,
  CurvePoint,
} from './useCurve';

import { CurveThumbnail } from './CurveView';
import { useDebounce } from 'react-use';
import clsx from 'clsx';
import { Button } from 'antd';
const TIME_TAB_LIST = [
  {
    label: '24h',
    key: '24h' as const,
    value: [0, dayjs()],
  },
  {
    label: '1 Week',
    key: '1W' as const,
    value: [dayjs().add(-7, 'd'), dayjs()],
  },
  {
    label: '1 Month',
    key: '1M' as const,
    value: [dayjs().add(-1, 'month'), dayjs()],
  },
  {
    label: '1 Year',
    key: '1Y' as const,
    value: [dayjs().add(-1, 'year'), dayjs()],
  },
].map((item) => {
  const v0 = item.value[0];
  const v1 = item.value[1];

  return {
    ...item,
    value: [
      typeof v0 === 'number' ? v0 : v0.utcOffset(0).startOf('day').unix(),
      typeof v1 === 'number' ? v1 : v1.utcOffset(0).startOf('day').unix(),
    ],
  };
});

export type TabKey = typeof TIME_TAB_LIST[number]['key'];

const REAL_TIME_TAB_LIST: TabKey[] = ['24h', '1W'];

const DATE_FORMATTER = 'MMM DD, YYYY';
const isRealTimeKey = (key) => REAL_TIME_TAB_LIST.includes(key);

export function TokenPriceChart({ token }) {
  const { t } = useTranslation();
  const [priceType, setPriceType] = useState('price');
  const [activeKey, setActiveKey] = useState(TIME_TAB_LIST[0].key);
  const [ready, setReady] = useState(false);

  const amount = useMemo(() => (priceType === 'holding' ? token.amount : 1), [
    priceType,
  ]);

  const { data: realTimeData } = use24hCurveData({
    tokenId: token._tokenId,
    serverId: token.chain,
    days: activeKey === '24h' ? 1 : 7,
    amount,
  });

  const { data: dateCurveData } = useDateCurveData({
    tokenId: token._tokenId,
    serverId: token.chain,
    ready,
  });

  const timeMachMapping = useMemo(() => {
    const result = {};
    TIME_TAB_LIST.forEach((e) => {
      if (!isRealTimeKey(e.key) && dateCurveData) {
        result[e.key] = formatTokenDateCurve(e.value, dateCurveData, amount);
      }
    });
    return result;
  }, [dateCurveData, amount]);

  const data = useMemo(() => {
    if (isRealTimeKey(activeKey)) {
      return realTimeData;
    }
    return timeMachMapping[activeKey];
  }, [activeKey, realTimeData, timeMachMapping]);

  const [isHover, setHover] = useState(false);
  const [curvePoint, setCurvePoint] = useState<CurvePoint>();
  const [isDebounceHover, setIsDebounceHover] = useState(false);
  const currentHover = isDebounceHover;

  const currentBalance = currentHover
    ? curvePoint?.value || token.price
    : token.price;

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

  const handleHoverCurve = (data) => {
    setCurvePoint(data);
  };

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
      priceType === 'holding' ? token.price * token.amount : token.price;
    return {
      date: dayjs().format(DATE_FORMATTER),
      balance: '$' + formatPrice(price || 0),
      isLoss: !!data?.isLoss,
      percent: percent,
    };
  }, [data?.isLoss, percent, token.price, priceType]);

  return (
    <div className="token-price-chart">
      <div className="price-tabs">
        <Button
          className={priceType === 'price' ? 'active' : ''}
          onClick={() => setPriceType('price')}
        >
          {t('page.tokenDetail.Price')}
        </Button>
        <Button
          className={priceType === 'holding' ? 'active' : ''}
          onClick={() => setPriceType('holding')}
        >
          {t('page.tokenDetail.HoldingValue')}
        </Button>
      </div>
      <div
        className={clsx('h-[80px] w-full relative')}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        {!!data && (
          <CurveThumbnail
            isHover={currentHover}
            data={data}
            onHover={handleHoverCurve}
          />
        )}
        {/* {!!shouldShowLoading && (
          <div className="flex mt-[14px]">
            <Skeleton.Input
              active
              className="m-auto w-[360px] h-[72px] rounded"
            />
          </div>
        )} */}
      </div>
      <div className="time-tabs">
        {TIME_TAB_LIST.map((e) => (
          <Button
            key={e.key}
            className={activeKey === e.key ? 'active' : ''}
            onClick={() => {
              setActiveKey(e.key);
              if (e.key !== '24h') {
                setReady(true);
              }
            }}
          >
            {e.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
