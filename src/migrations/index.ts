import { storage } from '@/background/webapi';
import * as migrations from './migrations';

const KEYS = [
  'chains',
  'contactBook',
  'pageStateCache',
  'permission',
  'preference',
  'transactions',
  'txHistory',
  'rpc',
];

const sortedMigrations = Object.values(migrations).sort((a, b) => {
  return a.version - b.version;
});

export default async function () {
  let result: any = {};
  const currentDataVersion = (await storage.get('dataVersion')) || 0;
  let dataVersion = currentDataVersion;

  if (
    sortedMigrations.length <= 0 ||
    currentDataVersion > sortedMigrations[sortedMigrations.length - 1].version
  ) {
    return;
  }

  for (let i = 0; i < KEYS.length; i++) {
    const key = KEYS[i];
    const d = await storage.get(key);
    result = Object.assign({}, result, { [key]: d });
  }

  for (let i = 0; i < sortedMigrations.length; i++) {
    const migration = sortedMigrations[i];
    if (migration.version > currentDataVersion) {
      const migrationResult = await migration.migrator(result);
      result = Object.assign({}, result, migrationResult);
      dataVersion = migration.version;
    }
  }
  for (const key in result) {
    await storage.set(key, result[key]);
  }
  await storage.set('dataVersion', dataVersion);
}
