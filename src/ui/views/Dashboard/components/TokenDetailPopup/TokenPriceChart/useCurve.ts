import { useWallet } from 'ui/utils';
import {
  formatPrice,
  formatTokenAmount,
  formatUsdValue,
} from 'ui/utils/number';
import { useRequest } from 'ahooks';
import dayjs from 'dayjs';
import { findLastIndex, range } from 'lodash';
import { useMemo } from 'react';

const patchCurveData = (
  data: {
    timestamp: number;
    price: number;
  }[],
  start: number,
  step: number
) => {
  const end = data?.[0]?.timestamp || 0;
  if (start < end) {
    return range(start, end, step)
      .map((timestamp) => {
        return {
          timestamp,
          price: 0,
        };
      })
      .concat(data);
  }
  return data;
};

export type CurvePoint = {
  value: number;
  netWorth: string;
  change: string;
  isLoss: boolean;
  changePercent: string;
  timestamp: number;
  dateString: string;
};

export const use24hCurveData = ({
  tokenId,
  serverId,
  days,
  amount,
}: {
  amount: number;
  tokenId: string;
  serverId: string;
  days: 1 | 7;
}) => {
  const wallet = useWallet();
  const { data, loading } = useRequest(
    async () => {
      const _data = await wallet.openapi.getTokenPriceCurve({
        chain_id: serverId,
        id: tokenId,
        days,
      });
      const start =
        days === 1
          ? dayjs().add(-24, 'hours').add(10, 'minutes').valueOf()
          : dayjs().add(-7, 'days').add(1, 'hour').valueOf();
      const step = days === 1 ? 5 * 60 * 1000 : 60 * 60 * 1000;
      return patchCurveData(
        _data.map((item) => {
          return {
            timestamp: dayjs.unix(item.time_at).valueOf(),
            price: item.price,
          };
        }),
        start,
        step
      );
    },
    {
      refreshDeps: [tokenId, serverId, days],
    }
  );

  const formatData = useMemo(() => {
    return formatTokenDateCurve([0, dayjs().unix()], data || [], amount);
  }, [data, amount]);

  return { data: formatData, loading };
  // return useRequest(
  //   async () => {
  //     let _data = await openapi.getTokenPriceCurve({
  //       chain_id: serverId,
  //       id: tokenId,
  //       days,
  //     });
  //     const start =
  //       days === 1
  //         ? dayjs().add(-24, 'hours').add(10, 'minutes').valueOf()
  //         : dayjs().add(-7, 'days').add(1, 'hour').valueOf();
  //     const step = days === 1 ? 5 * 60 * 1000 : 60 * 60 * 1000;
  //     const data = patchCurveData(
  //       _data.map(item => {
  //         return {
  //           timestamp: dayjs.unix(item.time_at).valueOf(),
  //           price: item.price,
  //         };
  //       }),
  //       start,
  //       step,
  //     );

  //     return formatTokenDateCurve([0, dayjs().unix()], data);
  //   },
  //   {
  //     refreshDeps: [tokenId, serverId, days],
  //   },
};

export const formatTokenDateCurve = (
  range: number[],
  data: { timestamp: number; price: number }[],
  amount: number = 1
) => {
  if (!data?.length) {
    return {
      list: [] as CurvePoint[],
      isEmptyAssets: true,
      isLoss: false,
    };
  }

  const startIdx = data.findIndex(
    (item) => dayjs(item.timestamp).unix() >= range[0]
  );
  const endIdx = findLastIndex(
    data,
    (item) => dayjs(item.timestamp).unix() <= range[1]
  );
  const list = data.slice(startIdx, endIdx + 1);

  if (!list?.length) {
    return {
      list: [] as CurvePoint[],
      isEmptyAssets: true,
      isLoss: false,
    };
  }

  const startData = {
    value: list[0].price * amount || 0,
    timestamp: dayjs(list[0].timestamp).valueOf(),
  };

  const result =
    list.map((item) => {
      const change = item.price * amount - startData.value;

      return {
        value: item.price * amount || 0,
        netWorth: item.price ? '$' + formatPrice(item.price * amount) : '$0',
        // change: numFormat(Math.abs(change), 0, '$'),
        change: '$' + formatPrice(Math.abs(change)),
        isLoss: change < 0,
        changePercent:
          startData.value === 0
            ? `${item.price === 0 ? '0' : '100.00'}%`
            : `${(Math.abs(change * 100) / startData.value).toFixed(2)}%`,
        timestamp: dayjs(item.timestamp).valueOf(),
        dateString: dayjs(item.timestamp).format('MM DD, YYYY'),
      };
    }) || [];

  const endNetWorth = result.length ? result[result.length - 1]?.value : 0;
  const assetsChange = endNetWorth - startData.value;

  return {
    list: result as CurvePoint[],
    isLoss: assetsChange < 0,
    isEmptyAssets: false,
  };
};

export const useDateCurveData = ({
  tokenId,
  serverId,
  ready,
}: {
  tokenId: string;
  serverId: string;
  ready?: boolean;
}) => {
  const wallet = useWallet();
  return useRequest(
    async () => {
      const _data = await wallet.openapi.getTokenDatePrice({
        chain_id: serverId,
        id: tokenId,
      });
      return patchCurveData(
        _data.map((item) => {
          return {
            timestamp: dayjs(item.date_at).valueOf(),
            price: item.price,
          };
        }),
        dayjs().startOf('day').add(-1, 'year').valueOf(),
        24 * 60 * 60 * 1000
      );
    },
    {
      refreshDeps: [tokenId, serverId],
      cacheKey: `date-token-price-${tokenId}-${serverId}`,
      staleTime: 20000,
      ready,
    }
  );
};
