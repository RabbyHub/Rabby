import { omit } from 'lodash';
import { Common, Hardfork } from '@ethereumjs/common';
import { TransactionFactory } from '@ethereumjs/tx';

const EIP7702_PLACEHOLDER_R = `0x${'11'.repeat(32)}`;
const EIP7702_PLACEHOLDER_S = `0x${'22'.repeat(32)}`;

function normalizeHexValue(value) {
  if (typeof value === 'number') {
    return `0x${value.toString(16)}`;
  }

  if (typeof value === 'bigint') {
    return `0x${value.toString(16)}`;
  }

  return value;
}

function buildAuthorizationList(authorizationList) {
  if (!Array.isArray(authorizationList)) {
    return authorizationList;
  }

  return authorizationList.map((item) => {
    if (!Array.isArray(item)) {
      return item;
    }

    const [chainId, address, nonce] = item;

    return {
      chainId: normalizeHexValue(chainId),
      address,
      nonce: normalizeHexValue(nonce),
      // L1 fee estimation happens before signing in the 7702 revoke flow, so we
      // synthesize a serializable authorization payload with fixed-size fields.
      yParity: '0x',
      r: EIP7702_PLACEHOLDER_R,
      s: EIP7702_PLACEHOLDER_S,
    };
  });
}

function buildTxParams(txMeta) {
  const txParams = {
    ...omit(txMeta.txParams, 'gas'),
    gasLimit: txMeta.txParams.gas || txMeta.txParams.gasLimit,
  };

  if ('authorizationList' in txParams) {
    txParams.authorizationList = buildAuthorizationList(
      txParams.authorizationList
    );
  }

  return txParams;
}

function buildTransactionCommon(txMeta) {
  const rawChainId = txMeta.txParams?.chainId ?? txMeta.chainId;
  const chainId = Number(rawChainId);

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error(
      `buildUnserializedTransaction requires a valid chainId, got ${String(
        rawChainId
      )}`
    );
  }

  // We only need a serializable payload for L1 fee oracles. Prague + 7702 keeps
  // legacy transactions working while allowing pre-sign EIP-7702 revoke txs to
  // be serialized as well.
  return Common.custom(
    {
      chainId,
    },
    {
      hardfork: Hardfork.Prague,
      eips: [7702],
    }
  );
}

export default function buildUnserializedTransaction(txMeta) {
  const txParams = buildTxParams(txMeta);
  const common = buildTransactionCommon(txMeta);
  return TransactionFactory.fromTxData(txParams, { common });
}
