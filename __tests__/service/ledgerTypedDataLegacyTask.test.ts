import path from 'path';

const taskModulePath = path.resolve(
  process.cwd(),
  'node_modules/@ledgerhq/device-signer-kit-ethereum/lib/cjs/internal/app-binder/task/SignTypedDataLegacyTask.js'
);

describe('Ledger typed-data legacy fallback', () => {
  it('ignores undeclared domain fields when hashing', async () => {
    const { SignTypedDataLegacyTask } = require(taskModulePath);
    const api = { sendCommand: jest.fn().mockResolvedValue('signed') };
    const data = {
      domain: {
        name: 'Test',
        version: '1',
        chainId: 1,
        verifyingContract: '0x0000000000000000000000000000000000000001',
        salt: '',
      },
      types: {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
        Mail: [{ name: 'contents', type: 'string' }],
      },
      primaryType: 'Mail',
      message: { contents: 'Hello' },
    };

    await expect(
      new SignTypedDataLegacyTask(api, data, '44/60/0/0/0', () => ({
        debug: jest.fn(),
        error: jest.fn(),
      })).run()
    ).resolves.toBe('signed');
    expect(api.sendCommand).toHaveBeenCalledTimes(1);
  });
});
