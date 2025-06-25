import { PreferenceStore } from '@/background/service/preference';
import { PermissionStore } from 'background/service/permission';

export default {
  version: 10,
  async migrator(data: {
    permission: PermissionStore | undefined;
    preference: PreferenceStore | undefined;
  }) {
    try {
      if (!data.permission) {
        return undefined;
      }
      return {
        permission: {
          dumpCache: data.permission.dumpCache.map((item) => {
            const site = item.v;
            return site.account
              ? {
                  ...item,
                  v: { ...item.v, account: undefined },
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
