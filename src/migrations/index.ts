import { storage } from '@/background/webapi';
import * as migrations from './migrations';

const KEYS = [
  'chains',
  'contactBook',
  'pageStateCache',
  'premission',
  'preference',
  'transactions',
  'txHistory',
];

const sortedMigrations = Object.values(migrations).sort((a, b) => {
  return a.version - b.version;
});

export default async function (currentDataVersion: number) {
  let result: any = {};
  let changed = false;
  let dataVersion = currentDataVersion;

  for (let i = 0; i < KEYS.length; i++) {
    const key = KEYS[i];
    const d = await storage.get(key);
    result = Object.assign({}, result, { [key]: d });
  }

  for (let i = 0; i < sortedMigrations.length; i++) {
    const migration = sortedMigrations[i];
    if (migration.version > currentDataVersion) {
      changed = true;
      const migrationResult = await migration.migrator(result);
      result = Object.assign({}, result, migrationResult);
      dataVersion = migration.version;
    }
  }
  if (!changed) return;
  for (const key in result) {
    await storage.set(key, result[key]);
  }
  await storage.set('dataVersion', dataVersion);
}
