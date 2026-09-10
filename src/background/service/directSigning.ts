import { v4 as uuidv4 } from 'uuid';
import { ethErrors } from 'eth-rpc-errors';
import {
  AccountRef,
  DirectSigningId,
  sameAccountRef,
} from '@/utils/signingTypes';

// Direct signing has no approval, retry runner, or broadcast result. Keep only
// the cancellation permission that must survive awaits in the background.
const pending = new Map<
  DirectSigningId,
  { account: AccountRef; origin: string }
>();

export const directSigning = {
  start(account: AccountRef, origin: string): DirectSigningId {
    const id = uuidv4() as DirectSigningId;
    pending.set(id, { account, origin });
    return id;
  },

  assertCurrent(
    id: DirectSigningId,
    account?: Partial<AccountRef>,
    origin?: string
  ) {
    const request = pending.get(id);
    if (
      !request ||
      (account && !sameAccountRef(request.account, account)) ||
      (origin !== undefined && request.origin !== origin)
    ) {
      throw ethErrors.provider.userRejectedRequest();
    }
  },

  end(id: DirectSigningId) {
    return pending.delete(id);
  },

  cancelAll(origin?: string) {
    pending.forEach((request, id) => {
      if (origin === undefined || request.origin === origin) pending.delete(id);
    });
  },
};
