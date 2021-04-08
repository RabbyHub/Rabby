import { Transaction } from "@ethereumjs/tx";
import eth from "background/eth";
import { http } from "background/request";

export default async ({ data: { params } }) => {
  const txParams = {
    nonce: '0x01',
    gasPrice: '0x09184e72a000',
    gas: '21000',
    to: '0x0000000000000000000000000000000000000011',
    value: '0x01',
    data: '0x7f7465737432000000000000000000000000000000000000000000000000000000600057',
    chainId: 1,
    from: '0x99f888c2ec48dcb851f95098db419a29e8a7c5fa',
  }

  const tx = Transaction.fromTxData(txParams);
  await eth.signTransaction(tx, txParams.from);

  const serializedTx = tx.serialize().toString('hex');

  return http('serializedTx', serializedTx);
};
