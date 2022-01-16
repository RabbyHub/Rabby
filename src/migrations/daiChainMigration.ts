import { PermissionStore } from 'background/service/permission';
import { CHAINS_ENUM } from 'consts';

export default {
  version: 2,
  async migrator(data: { permission: PermissionStore | undefined }) {
    try {
      if (!data.permission) return undefined;
      const hasDai = data.permission.dumpCache.some(
        (cache) => (cache.v.chain as string) === 'DAI'
      );
      if (!hasDai) return data;

      return {
        permission: {
          dumpCache: data.permission.dumpCache.map((item) => {
            return (item.v.chain as string) === 'DAI'
              ? { ...item, v: { ...item.v, chain: CHAINS_ENUM.GNOSIS } }
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
