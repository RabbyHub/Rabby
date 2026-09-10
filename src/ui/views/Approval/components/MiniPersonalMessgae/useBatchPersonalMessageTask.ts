import { useWallet } from '@/ui/utils';
import { sendPersonalMessage } from '@/ui/utils/sendPersonalMessage';
import {
  MessageTaskItem,
  useBatchSignMessageTask,
} from '@/ui/hooks/useBatchSignMessageTask';

export type MiniPersonalMessage = { data: [string, string] };
type ListItemType = MessageTaskItem & {
  tx: MiniPersonalMessage;
  options?: Omit<
    Parameters<typeof sendPersonalMessage>[0],
    'wallet' | 'onProgress' | keyof MiniPersonalMessage
  >;
};

export const useBatchSignPersonalMessageTask = ({
  ga,
}: {
  ga?: Record<string, any>;
}) => {
  const wallet = useWallet();
  return useBatchSignMessageTask<ListItemType>(({ tx, options }, onProgress) =>
    sendPersonalMessage({ ...tx, ...options, wallet, onProgress })
  );
};

export type BatchSignPersonalMessageTaskType = ReturnType<
  typeof useBatchSignPersonalMessageTask
>;
