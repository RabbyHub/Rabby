import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getSignEventErrorMessage } from '@/utils/signEvent';

// Exercise both production catch blocks without mocking the transaction
// preparation pipeline. Local recovery must receive the original device error.
const source = readFileSync(
  resolve(__dirname, '../../src/ui/utils/sendTransaction.ts'),
  'utf8'
);
const handlers = Array.from(
  source.matchAll(
    /catch \(e\) \{\n(    await handleSendAfter\(\);[\s\S]*?)\n  \}\n\n  onProgress\?\.\('signed'\);/g
  ),
  (match) =>
    new Function(
      'e',
      'handleSendAfter',
      'getSignEventErrorMessage',
      'FailedCode',
      `return (async () => { ${match[1]} })();`
    )
);

test('covers the legacy and V2 direct submission handlers', () => {
  expect(handlers).toHaveLength(2);
});

test.each([
  new Error('0x5515'),
  { errorMsg: '0x5515', message: 'generic failure' },
  '0x5515',
])(
  'preserves the hardware recovery message for a local caller: %p',
  async (error) => {
    for (const handler of handlers) {
      const cleanup = jest.fn();
      await expect(
        handler(error, cleanup, getSignEventErrorMessage, {
          SubmitTxFailed: 'SubmitTxFailed',
        })
      ).rejects.toMatchObject({ name: 'SubmitTxFailed', message: '0x5515' });
      expect(cleanup).toHaveBeenCalledTimes(1);
    }
  }
);
