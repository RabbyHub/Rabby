import { readFileSync } from 'fs';
import { resolve } from 'path';

// Outside the desktop UI, AddressBackup navigates to
// `/settings/address-backup/${path}` after the password check. The target is
// built at runtime, so nothing else notices when one of those routes goes
// missing: the user authenticates and lands on an empty page.
const read = (file: string) =>
  readFileSync(resolve(__dirname, '../../src/ui/views', file), 'utf8');

describe('address backup routes', () => {
  const backup = read('AddressDetail/AddressBackup.tsx');
  const routes = read('MainRoute.tsx');

  const backupTypes = [
    ...new Set(
      [...backup.matchAll(/handleBackup\(\s*'([a-z-]+)'\s*\)/g)].map(
        (m) => m[1]
      )
    ),
  ];

  test('AddressBackup still builds its target from the backup type', () => {
    expect(backup).toContain('pathname: `/settings/address-backup/${path}`');
    expect(backupTypes.sort()).toEqual(['mneonics', 'private-key']);
  });

  test.each(backupTypes)(
    'MainRoute registers /settings/address-backup/%s',
    (type) => {
      expect(routes).toContain(`path="/settings/address-backup/${type}"`);
    }
  );
});
