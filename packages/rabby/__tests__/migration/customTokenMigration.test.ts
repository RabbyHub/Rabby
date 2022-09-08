/**
 * @jest-environment jsdom
 */
import customTokenMigration from '../../src/migrations/customTokenMigration';

const data = {
  preference: {
    addedToken: {
      '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85': [
        '0x9a78649501bbaac285ea4187299471b7ad4abd35',
        '0x9a78649501bbaac285ea4187299471b7ad4abd36',
      ],
      '0xf08c90c7f470b640a21dd9b3744eca3d1d16a044': [
        '0x9a78649501bbbac285ea4187299471b7ad4abd35',
      ],
    },
  },
};

test('should migrate data', () => {
  return customTokenMigration
    .migrator(data, [
      { id: '0x9a78649501bbaac285ea4187299471b7ad4abd35', chain: 'bsc' },
      { id: '0x9a78649501bbaac285ea4187299471b7ad4abd36', chain: 'cro' },
      { id: '0x9a78649501bbbac285ea4187299471b7ad4abd35', chain: 'eth' },
    ])
    .then((result) => {
      expect(result!.preference.addedToken).toEqual({
        '0x5853ed4f26a3fcea565b3fbc698bb19cdf6deb85': [
          'bsc:0x9a78649501bbaac285ea4187299471b7ad4abd35',
          'cro:0x9a78649501bbaac285ea4187299471b7ad4abd36',
        ],
        '0xf08c90c7f470b640a21dd9b3744eca3d1d16a044': [
          'eth:0x9a78649501bbbac285ea4187299471b7ad4abd35',
        ],
      });
    });
});

const data1 = {
  preference: {
    addedToken: {},
  },
};
test('do nothing if empty', () => {
  return customTokenMigration.migrator(data1).then((result) => {
    expect(result!.preference.addedToken).toEqual({});
  });
});
