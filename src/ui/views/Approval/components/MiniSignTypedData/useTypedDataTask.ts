import { useWallet } from '@/ui/utils';
import { sendSignTypedData } from '@/ui/utils/sendTypedData';
import {
  MessageTaskItem,
  useBatchSignMessageTask,
} from '@/ui/hooks/useBatchSignMessageTask';

export type MiniTypedData = {
  data: Record<string, any>;
  from: string;
  version: 'V1' | 'V3' | 'V4';
};
type ListItemType = MessageTaskItem & {
  tx: MiniTypedData;
  options?: Omit<
    Parameters<typeof sendSignTypedData>[0],
    'wallet' | 'onProgress' | keyof MiniTypedData
  >;
};

export const useBatchSignTypedDataTask = ({
  ga,
}: {
  ga?: Record<string, any>;
}) => {
  const wallet = useWallet();
  return useBatchSignMessageTask<ListItemType>(({ tx, options }, onProgress) =>
    sendSignTypedData({ ...tx, ...options, wallet, onProgress })
  );
};

export type BatchSignTypedDataTaskType = ReturnType<
  typeof useBatchSignTypedDataTask
>;
