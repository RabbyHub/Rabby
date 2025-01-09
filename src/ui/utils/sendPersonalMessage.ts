import { EVENTS, INTERNAL_REQUEST_SESSION } from '@/constant';
import { WalletControllerType } from '@/ui/utils';
import { getKRCategoryByType } from '@/utils/transaction';
import eventBus from '@/eventBus';
import { matomoRequestEvent } from '@/utils/matomo-request';

// fail code
export enum FailedCode {
  SubmitTxFailed = 'SubmitTxFailed',
  DefaultFailed = 'DefaultFailed',
}

const report = async ({
  action,
  wallet,
  currentAccount,
  extra,
}: {
  action:
    | 'createSignText'
    | 'startSignText'
    | 'cancelSignText'
    | 'completeSignText';
  currentAccount;
  wallet: WalletControllerType;
  extra?: Record<string, any>;
}) => {
  if (!currentAccount) {
    return;
  }
  matomoRequestEvent({
    category: 'SignText',
    action: action,
    label: [
      getKRCategoryByType(currentAccount.type),
      currentAccount.brandName,
    ].join('|'),
    transport: 'beacon',
  });
  await wallet.reportStats(action, {
    type: currentAccount.brandName,
    category: getKRCategoryByType(currentAccount.type),
    method: 'personalSign',
    ...extra,
  });
};

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
}: {
  data: string[];
  wallet: WalletControllerType;
  onProgress?: (status: ProgressStatus) => void;
  ga?: Record<string, any>;
}) => {
  onProgress?.('building');
  const { address, ...currentAccount } = (await wallet.getCurrentAccount())!;

  report({
    action: 'createSignText',
    wallet,
    currentAccount,
  });

  onProgress?.('builded');

  const handleSendAfter = async () => {
    report({
      action: 'completeSignText',
      wallet,
      currentAccount,
    });
  };

  report({ action: 'startSignText', wallet, currentAccount });

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
        },
      },
    });
    await handleSendAfter();
  } catch (e) {
    await handleSendAfter();
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
