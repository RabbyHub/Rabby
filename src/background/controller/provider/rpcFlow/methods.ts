import { Transaction } from '@ethereumjs/tx';
import { eth, permission, account } from 'background/service';
import { http } from 'background/utils';

// eth_chainId: methodMap.getChainId,
// personal_sign: methodMap.personalSign,
// eth_requestAccounts: methodMap.getAccounts,
// eth_accounts: methodMap.getAccounts,
// eth_sendTransaction: methodMap.sendTransaction,
// eth_getTransactionCount: () => '0x100',

export const ethSendTransaction = async ({ data: { params } }) => {
  const [txParams] = params;

  const tx = Transaction.fromTxData(txParams);
  await eth.signTransaction(tx, txParams.from);

  const serializedTx = tx.serialize().toString('hex');

  return http('serializedTx', serializedTx);
};

export const personalSign = ({
  data: {
    params: [data, from],
  },
}) => eth.signPersonalMessage({ data, from });

export const ethAccounts = ({ session: { origin } }) => {
  if (!permission.hasPerssmion(origin)) {
    return [];
  }

  return account.getAccounts();
};

export const ethChainId = () => '0x1';

export const ethGetTransactionCount = () => '0x100';

export const ethRequestAccounts = ethAccounts;
