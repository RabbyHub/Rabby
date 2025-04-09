import { useRequest } from 'ahooks';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import { sortBy } from 'lodash';

const fetchData = async (url: string) => {
  if (url.includes('API_KEY')) {
    return null;
  }

  try {
    const start = Date.now();
    const { data } = await axios.post(
      url,
      {
        jsonrpc: '2.0',
        method: 'eth_getBlockByNumber',
        params: ['latest', false],
        id: 1,
      },
      {
        timeout: 20_000,
      }
    );
    const number = data?.result?.number ?? null;
    const end = Date.now();

    if (number) {
      const height = new BigNumber(number).toNumber() || 0;
      return {
        url,
        height,
        latency: end - start,
      };
    }
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const useRPCData = (options?: {
  onSuccess?: (
    data: {
      url: string;
      height: number;
      latency: number;
    }[],
    params: [urls: string[]]
  ) => void;
}) => {
  return useRequest(
    async (urls: string[]) => {
      const list = (
        await Promise.all(urls.map((url) => fetchData(url)))
      ).filter((res): res is NonNullable<typeof res> => !!res);
      return sortBy(
        list,
        (item) => -item.height,
        (item) => item.latency
      );
    },
    {
      manual: true,
      ...options,
    }
  );
};
