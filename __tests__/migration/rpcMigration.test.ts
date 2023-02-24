/**
 * @jest-environment jsdom
 */
import rpcMigration from '../../src/migrations/customRPCMigration';

interface PrevStore {
  customRPC: Record<string, string>;
}

const data: { rpc: PrevStore } = {
  rpc: {
    customRPC: {
      BSC: 'https://rpc.bsc.com/bsc',
      ETH: 'https://rpc.eth.com/eth',
    },
  },
};

test('should migrate data', () => {
  return rpcMigration.migrator(data).then((result) => {
    console.log(result!.rpc);
    expect(result!.rpc).toEqual({
      customRPC: {
        BSC: {
          url: 'https://rpc.bsc.com/bsc',
          enable: true,
        },
        ETH: {
          url: 'https://rpc.eth.com/eth',
          enable: true,
        },
      },
    });
  });
});

test('return undefined for new user', () => {
  rpcMigration.migrator({ rpc: undefined }).then((result) => {
    expect(result).toBeUndefined();
  });
});
