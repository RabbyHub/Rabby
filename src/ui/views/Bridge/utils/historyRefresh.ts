export const bridgeTxIdKey = (id?: string) => (id || '').toLowerCase();

export const sameBridgeTxId = (left?: string, right?: string) => {
  const key = bridgeTxIdKey(left);
  return !!key && key === bridgeTxIdKey(right);
};

export const findLocalBridgeTx = <
  T extends { hash?: string; acceleratedHash?: string }
>(
  locals: T[],
  txId?: string
) =>
  locals.find(
    (item) =>
      sameBridgeTxId(item.hash, txId) ||
      sameBridgeTxId(item.acceleratedHash, txId)
  );
