import {
  getSeedPhraseGroupTotalBalance,
  sortSeedPhraseGroups,
} from '@/ui/views/AddFromCurrentSeedPhrase/sort';

describe('sortSeedPhraseGroups', () => {
  test('sorts by total balance, then address count, then creation order desc', () => {
    const groups = [
      {
        index: 0,
        publicKey: 'oldest',
        list: [{ balance: 10 }],
      },
      {
        index: 1,
        publicKey: 'more-addresses',
        list: [{ balance: 5 }, { balance: 5 }],
      },
      {
        index: 2,
        publicKey: 'newest',
        list: [{ balance: 10 }],
      },
      {
        index: 3,
        publicKey: 'highest-balance',
        list: [{ balance: 15 }],
      },
    ];

    const sorted = sortSeedPhraseGroups(groups);

    expect(sorted.map((group) => group.publicKey)).toEqual([
      'highest-balance',
      'more-addresses',
      'newest',
      'oldest',
    ]);
  });

  test('calculates total balance with falsy balances safely', () => {
    expect(
      getSeedPhraseGroupTotalBalance({
        list: [{ balance: undefined }, { balance: null }, { balance: '2.5' }],
      })
    ).toBe(2.5);
  });
});
