/**
 * @jest-environment jsdom
 */
import customizedTokenMigration from '../../src/migrations/customizedTokenMigration';

const data = {
  preference: {
    addedToken: {
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85': [
        'bsc:0x9a78649501bbaac285ea4187299471b7ad4abd35',
        'cro:0x9a78649501bbaac285ea4187299471b7ad4abd36',
      ],
      '0xf08c90c7f470b640a21dd9b3744eca3d1d16a044': [
        'eth:0x9a78649501bbbac285ea4187299471b7ad4abd35',
        'bsc:0x9a78649501bbaac285ea4187299471b7ad4abd35',
      ],
    },
  },
};

test('should migrate data', () => {
  return customizedTokenMigration.migrator(data).then((result) => {
    expect(result!.preference.customizedToken).toEqual([
      {
        chain: 'bsc',
        address: '0x9a78649501bbaac285ea4187299471b7ad4abd35',
      },
      {
        chain: 'cro',
        address: '0x9a78649501bbaac285ea4187299471b7ad4abd36',
      },
      {
        chain: 'eth',
        address: '0x9a78649501bbbac285ea4187299471b7ad4abd35',
      },
    ]);
  });
});

const data1 = {
  preference: {
    addedToken: {},
  },
};
test('do nothing if empty', () => {
  return customizedTokenMigration.migrator(data1).then((result) => {
    expect(result!.preference.customizedToken).toEqual([]);
  });
});
