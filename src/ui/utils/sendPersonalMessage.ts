import { EVENTS, INTERNAL_REQUEST_SESSION } from '@/constant';
import { WalletControllerType } from '@/ui/utils';
import eventBus from '@/eventBus';
import { Account } from '@/background/service/preference';
import type { DrawerProps } from 'antd';

// fail code
export enum FailedCode {
  SubmitTxFailed = 'SubmitTxFailed',
  DefaultFailed = 'DefaultFailed',
}

type ProgressStatus = 'building' | 'builded' | 'signed' | 'submitted';

/**
 * send personal message without rpcFlow
 * @param data
 * @param wallet
 * @param onProgress callback
 */
export const sendPersonalMessage = async ({
  data,
  wallet,
  onProgress,
  ga,
  account,
  getContainer,
}: {
  data: string[];
  wallet: WalletControllerType;
  onProgress?: (status: ProgressStatus) => void;
  ga?: Record<string, any>;
  account?: Account;
  getContainer?: DrawerProps['getContainer'];
}) => {
  onProgress?.('building');
  const { address, ...currentAccount } =
    account || (await wallet.getCurrentAccount())!;

  onProgress?.('builded');

  // submit tx
  let hash = '';
  try {
    hash = await wallet.ethPersonalSign({
      data: {
        $ctx: {
          ga,
        },
        params: data,
      },
      session: INTERNAL_REQUEST_SESSION,
      approvalRes: {
        type: currentAccount.type,
        address: address,
        extra: {
          brandName: currentAccount.brandName,
          signTextMethod: 'personalSign',
          ...(getContainer !== undefined
            ? {
                popupProps: {
                  getContainer,
                },
              }
            : {}),
        },
      },
      account: {
        address,
        ...currentAccount,
      },
    });
  } catch (e) {
    console.error(e);
    const err = new Error(e.message);
    err.name = FailedCode.SubmitTxFailed;
    eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, e.message);
    throw err;
  }

  onProgress?.('signed');

  return {
    txHash: hash,
  };
};
