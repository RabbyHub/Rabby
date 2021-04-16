import { Transaction } from '@ethereumjs/tx';
import { eth } from 'background/service';
import { http } from 'background/utils';

export default async ({ data: { params } }) => {
  const [txParams] = params;

  const tx = Transaction.fromTxData(txParams);
  await eth.signTransaction(tx, txParams.from);

  const serializedTx = tx.serialize().toString('hex');

  return http('serializedTx', serializedTx);
};
