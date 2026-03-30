import { Dexie } from 'dexie';
import { DexieEntityTable, schema, schemaV1, schemaV2 } from './schema';

export const db = new Dexie('rabby-database') as Dexie & DexieEntityTable;

db.version(1).stores(schemaV1);
db.version(2).stores(schemaV2);
db.version(3).stores(schema);
