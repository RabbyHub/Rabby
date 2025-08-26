import { EVENTS, INTERNAL_REQUEST_SESSION } from '@/constant';
import { WalletControllerType } from '@/ui/utils';
import { getKRCategoryByType } from '@/utils/transaction';
import eventBus from '@/eventBus';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ga4 } from '@/utils/ga4';
import { Account } from '@/background/service/preference';
import { underline2Camelcase } from '@/background/utils';

// fail code
export enum FailedCode {
  SubmitTxFailed = 'SubmitTxFailed',
  DefaultFailed = 'DefaultFailed',
}

const report = async ({
  action,
  wallet,
  currentAccount,
  method,
  extra,
}: {
  action:
    | 'createSignText'
    | 'startSignText'
    | 'cancelSignText'
    | 'completeSignText';
  currentAccount;
  wallet: WalletControllerType;
  method: string;
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

  if (action === 'createSignText') {
    ga4.fireEvent('Init_SignText', {
      event_category: 'SignText',
    });
  } else if (action === 'startSignText') {
    ga4.fireEvent('Submit_SignText', {
      event_category: 'SignText',
    });
  }

  await wallet.reportStats(action, {
    type: currentAccount.brandName,
    category: getKRCategoryByType(currentAccount.type),
    method: underline2Camelcase(method),
    ...extra,
  });
};

type ProgressStatus = 'building' | 'builded' | 'signed' | 'submitted';

export const sendSignTypedData = async ({
  data,
  from,
  version,
  wallet,
  onProgress,
  // ga,
  account: _account,
}: {
  from: string;
  data: Record<string, any>;
  version: 'V1' | 'V3' | 'V4';
  wallet: WalletControllerType;
  onProgress?: (status: ProgressStatus, hash?: string) => void;
  ga?: Record<string, any>;
  account?: Account;
}) => {
  const account = _account || (await wallet.getCurrentAccount());
  if (!account) {
    throw new Error('Account is required for signing typed data');
  }
  onProgress?.('building');
  const { address, ...currentAccount } = account;

  const method = `ethSignTypedData${version === 'V1' ? '' : version}`;
  report({
    action: 'createSignText',
    wallet,
    currentAccount,
    method,
  });

  onProgress?.('builded');

  const handleSendAfter = async () => {
    report({
      action: 'completeSignText',
      wallet,
      currentAccount,
      method,
    });
  };

  report({ action: 'startSignText', wallet, currentAccount, method });

  let hash = '';
  try {
    const data1 = data as any;

    hash = await wallet.signTypedData(account?.type, from, data1, {
      brandName: currentAccount.brandName,
      signTextMethod: method,
      version: version,
    });

    await wallet.signTextCreateHistory({
      address: from,
      text: JSON.stringify(data),
      origin: INTERNAL_REQUEST_SESSION.origin,
      type: 'ethSignTypedData',
    });

    await handleSendAfter();
  } catch (e) {
    console.error(e);
    await handleSendAfter();
    const err = new Error(e.message);
    err.name = FailedCode.SubmitTxFailed;
    eventBus.emit(EVENTS.COMMON_HARDWARE.REJECTED, e.message);
    throw err;
  }

  onProgress?.('signed', hash);

  return {
    txHash: hash,
  };
};
