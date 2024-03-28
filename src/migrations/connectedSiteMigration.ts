import { PermissionStore } from 'background/service/permission';

export default {
  version: 3,
  async migrator(data: { permission: PermissionStore | undefined }) {
    try {
      if (!data.permission) return undefined;
      const hasIsConnected = data.permission.dumpCache.every(
        (cache) => 'isConnected' in cache.v
      );
      if (hasIsConnected) return data;

      return {
        permission: {
          dumpCache: data.permission.dumpCache.map((item) => {
            return 'isConnected' in item.v
              ? item
              : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                { ...item, v: { ...item.v, isConnected: true } };
          }),
        },
      };
    } catch (e) {
      // drop custom tokens if migrate failed
      return data;
    }
  },
};
