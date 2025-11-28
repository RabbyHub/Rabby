import { useMemoizedFn } from 'ahooks';
import { DrawerProps } from 'antd';

import { Account } from '@/background/service/preference';
import { typedDataSignatureStore } from '@/ui/component/MiniSignV2/state/TypedDataSignatureManager';
import { MiniTypedData } from '@/ui/views/Approval/components/MiniSignTypedData/useTypedDataTask';
import { useWallet } from '@/ui/utils';

type StartParams = {
  txs: MiniTypedData[];
  account: Account;
  directSubmit?: boolean;
  canUseDirectSubmitTx?: boolean;
  noShowModalLoading?: boolean;
  getContainer?: DrawerProps['getContainer'];
  mode?: 'UI' | 'DIRECT';
  title?: React.ReactNode;
};

export const useTypedDataSigner = () => {
  const wallet = useWallet();

  const start = useMemoizedFn((params: StartParams) => {
    const { txs, account, ...rest } = params;
    return typedDataSignatureStore.start({
      txs,
      config: {
        account,
        ...rest,
      },
      wallet,
    });
  });

  const retry = useMemoizedFn(() => typedDataSignatureStore.retry());
  const close = useMemoizedFn(() => typedDataSignatureStore.close());

  return {
    start,
    retry,
    close,
  } as const;
};
