import { db } from '..';
import {
  canCachePerpsHomeBalance,
  PerpsHomeAccount,
  PerpsHomeAmount,
} from '../schema/perpsHomeBalance';

export const perpsHomeBalanceDbService = {
  async get(account: PerpsHomeAccount) {
    if (!canCachePerpsHomeBalance(account)) return null;
    return (
      (await db.perpsHomeBalance.get(account.address.toLowerCase())) ?? null
    );
  },

  async put(account: PerpsHomeAccount, amount: PerpsHomeAmount) {
    if (!canCachePerpsHomeBalance(account) || !Number.isFinite(amount.value))
      return;
    const address = account.address.toLowerCase();
    await db.transaction('rw', db.perpsHomeBalance, async () => {
      const previous = await db.perpsHomeBalance.get(address);
      if (previous?.kind === amount.kind && previous.value === amount.value)
        return;
      await db.perpsHomeBalance.put({
        address,
        kind: amount.kind,
        value: amount.value,
        updatedAt: Date.now(),
      });
    });
  },

  async removeIfUnsupported(
    account: PerpsHomeAccount,
    remaining: PerpsHomeAccount[]
  ) {
    if (!canCachePerpsHomeBalance(account)) return;
    const address = account.address.toLowerCase();
    if (
      remaining.some(
        (item) =>
          item.address.toLowerCase() === address &&
          canCachePerpsHomeBalance(item)
      )
    )
      return;
    await db.perpsHomeBalance.delete(address);
  },
};
