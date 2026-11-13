import fs from 'fs';
import path from 'path';

jest.mock('@/ui/utils', () => ({
  isSameAddress: (a: string, b: string) => a.toLowerCase() === b.toLowerCase(),
}));

import { getSafeOperation } from '@/ui/utils/gnosis';

describe('getSafeOperation', () => {
  test.each([
    [undefined, 0],
    [null, 0],
    [0, 0],
    ['0', 0],
    [1, 1],
    ['1', 1],
  ])('normalizes %p to %p', (input, expected) => {
    expect(getSafeOperation(input)).toBe(expected);
  });

  test.each([2, '2', true, -1])('rejects unsupported operation %p', (input) => {
    expect(() => getSafeOperation(input)).toThrow('Unsupported Safe operation');
  });

  it('uses the same normalized operation for preview and signing', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/ui/views/Approval/components/SignTx.tsx'),
      'utf8'
    );

    expect(source).toContain(
      'getSafeOperation(params?.data?.[0]?.operation) === 1'
    );
    expect(source).toContain(
      'operation: getSafeOperation(params.data[0].operation)'
    );
    expect(source).toContain('gnosisGenerateTypedData(transactionHash)');
  });
});
