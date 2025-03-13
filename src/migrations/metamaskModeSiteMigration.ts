import { PermissionStore } from 'background/service/permission';

export default {
  version: 8,
  async migrator(data: { permission: PermissionStore | undefined }) {
    try {
      if (!data.permission) return undefined;

      return {
        permission: {
          dumpCache: data.permission.dumpCache.map((item) => {
            return !item.v.isMetamaskMode
              ? item
              : { ...item, v: { ...item.v, isMetamaskMode: false } };
          }),
        },
      };
    } catch (e) {
      // drop custom tokens if migrate failed
      return data;
    }
  },
};
