import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { is7702Tx } from '@/utils/transaction';

/**
 * Whether a SignTx request must show EIP7702Warning (reject-only) instead of the
 * signing page. `tx` is the normalized transaction.
 *
 * - From outside Rabby: any EIP-7702 tx, or any request flagged as a 7702 revoke.
 * - From Rabby itself: an EIP-7702 tx unless it is a speed-up or a revoke.
 */
export const shouldBlockEIP7702Tx = ({
  tx,
  origin,
  isEIP7702Revoke,
}: {
  tx: { authorizationList?: unknown; isSpeedUp?: boolean };
  origin?: string;
  isEIP7702Revoke?: boolean;
}) => {
  const is7702 = is7702Tx({ authorizationList: tx.authorizationList } as any);

  if ((is7702 || isEIP7702Revoke) && origin !== INTERNAL_REQUEST_ORIGIN) {
    return true;
  }
  return !!(is7702 && !(tx.isSpeedUp || isEIP7702Revoke));
};
