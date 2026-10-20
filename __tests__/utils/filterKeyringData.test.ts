import { getAddress } from 'viem';
import { filterKeyringData } from '@/utils/account';

const ADDR_A = getAddress('0x8eae34aa1f6a3e2f3b0c0b6d1f3c9a6e8b32e626');
const ADDR_B = getAddress('0x4294700000000000000000000000000000cfdd22');
const ADDR_C = '0x1111111111111111111111111111111111111111';

describe('filterKeyringData', () => {
  it('keeps selected addresses once each', () => {
    const data = {
      accounts: [ADDR_A, ADDR_B, ADDR_B, ADDR_B.toLowerCase(), ADDR_C, ADDR_B],
      accountDetails: { [ADDR_A]: { index: 0 }, [ADDR_B]: { index: 1 } },
    };

    const result = filterKeyringData(data, [ADDR_A, ADDR_B]) as typeof data;

    expect(result.accounts).toEqual([ADDR_A, ADDR_B]);
    expect(Object.keys(result.accountDetails)).toEqual([ADDR_A, ADDR_B]);
  });
});
