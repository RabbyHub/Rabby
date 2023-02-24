import { RPCServiceStore } from 'background/service/rpc';

interface PrevStore {
  customRPC: Record<string, string>;
}

export default {
  version: 5,
  async migrator(data: { rpc: PrevStore | undefined }) {
    try {
      if (!data.rpc) return undefined;
      const result: RPCServiceStore = {
        customRPC: {},
      };
      for (const key in data.rpc.customRPC) {
        const url = data.rpc.customRPC[key];
        result.customRPC[key] = {
          url,
          enable: true,
        };
      }

      return {
        rpc: result,
      };
    } catch (e) {
      // drop custom tokens if migrate failed
      return data;
    }
  },
};
