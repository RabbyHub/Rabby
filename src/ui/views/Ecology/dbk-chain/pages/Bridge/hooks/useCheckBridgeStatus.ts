import { DbkBridgeHistoryItem } from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import { keyBy } from 'lodash';
import { checkBridgeStatus } from '../../../utils';
import { useCreateViemClient } from './useCreateViemClient';

export const useCheckBridgeStatus = ({
  list,
  clientL1,
  clientL2,
}: {
  list: DbkBridgeHistoryItem[];
  clientL1: ReturnType<typeof useCreateViemClient>['clientL1'];
  clientL2: ReturnType<typeof useCreateViemClient>['clientL2'];
}) => {
  return useRequest(
    async () => {
      let pendingCount = 0;
      const res = await Promise.all(
        list.map(async (item) => {
          const status = await checkBridgeStatus({
            item,
            clientL1,
            clientL2,
          });
          if (status !== 'finalized') {
            pendingCount += 1;
          }
          return {
            ...item,
            status,
          };
        })
      );

      return {
        pendingCount,
        list: res,
        dict: keyBy(res, (item) => `${item.from_chain_id}:${item.tx_id}`),
      };
    },
    {
      refreshDeps: [list.length],
    }
  );
};
