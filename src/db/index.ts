import { Dexie } from 'dexie';
import { DexieEntityTable, schema } from './schema';

export const db = new Dexie('rabby-database') as Dexie & DexieEntityTable;

db.version(1).stores(schema);
