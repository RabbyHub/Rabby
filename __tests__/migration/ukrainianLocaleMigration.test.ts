/**
 * @jest-environment jsdom
 */
import ukrainianLocaleMigration from '../../src/migrations/ukrainianLocaleMigration';

test('migrates the Ukrainian locale code', async () => {
  const result = await ukrainianLocaleMigration.migrator({
    preference: {
      locale: 'ua-UA',
    } as any,
  });

  expect(result?.preference?.locale).toBe('uk-UA');
});

test('keeps other locale codes unchanged', async () => {
  const result = await ukrainianLocaleMigration.migrator({
    preference: {
      locale: 'en',
    } as any,
  });

  expect(result?.preference?.locale).toBe('en');
});

test('does not create preference for new installs', async () => {
  const result = await ukrainianLocaleMigration.migrator({
    preference: undefined,
  });

  expect(result).toBeUndefined();
});
