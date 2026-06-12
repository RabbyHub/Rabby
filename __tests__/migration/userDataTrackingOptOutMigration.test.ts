/**
 * @jest-environment jsdom
 */
import userDataTrackingOptOutMigration from '../../src/migrations/userDataTrackingOptOutMigration';

test('sets userDataTrackingOptOut to false for existing users', async () => {
  const result = await userDataTrackingOptOutMigration.migrator({
    preference: {
      currentVersion: '0.93.92',
      firstOpen: false,
    } as any,
  });

  expect(result?.preference?.userDataTrackingOptOut).toBe(false);
  expect(result?.preference?.currentVersion).toBe('0.93.92');
});

test('does not create preference for new installs', async () => {
  const result = await userDataTrackingOptOutMigration.migrator({
    preference: undefined,
  });

  expect(result).toBeUndefined();
});
