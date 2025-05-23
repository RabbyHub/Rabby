import { PreferenceStore } from '@/background/service/preference';
import { PermissionStore } from 'background/service/permission';

export default {
  version: 9,
  async migrator(data: {
    permission: PermissionStore | undefined;
    preference: PreferenceStore | undefined;
  }) {
    try {
      if (!data.permission) {
        return undefined;
      }
      const currentAccount = data.preference?.currentAccount;
      if (!currentAccount) {
        return undefined;
      }

      return {
        permission: {
          dumpCache: data.permission.dumpCache.map((item) => {
            const site = item.v;
            return site.isConnected && !site.account
              ? {
                  ...item,
                  v: { ...item.v, account: currentAccount },
                }
              : item;
          }),
        },
      };
    } catch (e) {
      // drop custom tokens if migrate failed
      return data;
    }
  },
};
