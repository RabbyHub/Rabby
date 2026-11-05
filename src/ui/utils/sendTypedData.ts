import { EVENTS, INTERNAL_REQUEST_SESSION } from '@/constant';
import { WalletControllerType } from '@/ui/utils';
import eventBus from '@/eventBus';
import { Account } from '@/background/service/preference';

// fail code
export enum FailedCode {
  SubmitTxFailed = 'SubmitTxFailed',
  DefaultFailed = 'DefaultFailed',
}

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
  onProgress?.('builded');

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
  } catch (e) {
    console.error(e);
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
