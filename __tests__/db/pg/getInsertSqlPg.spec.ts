// noinspection SqlDialectInspection

import * as path from 'path';
import fs from 'fs';
import { getInsertSqlPg, queryPg, TRecordSet } from '../../../src';

const connectionId = 'test';
const commonSchemaAndTable = 'test.table_schema';

beforeAll(async () => {
  const sql = fs.readFileSync(path.normalize(path.join(process.cwd(), '__tests__/db/pg/ddl/test.test_table_schema.sql')), 'utf-8');
  await queryPg(connectionId, sql);
});

const norm = (s: string): string => s.replace(/\s+/sg, '');

const expectedInsertSql = norm(`
    INSERT INTO "test"."table_schema" ("i1", "si1", "vc1", "dtz1", "time1", "bool1")
    VALUES (111,11,'aaa','2022-12-31T22:02:03.345Z'::timestamptz,'23:04:06',true)
         ,(222,12,'bbb',CURRENT_TIMESTAMP,'23:04:06',true) ON CONFLICT DO NOTHING  RETURNING * ;
`);

describe('getInsertSqlPg()', () => {
  test('getInsertSqlPg', async () => {
    const packet: TRecordSet = [
      {
        i1: 111,
        si1: 11,
        vc1: 'aaa',
        dtz1: '2023-01-01T01:02:03.345',
        time1: '23:04:06',
        bool1: 1,
        bool2: 1,
      },
      {
        i1: 222,
        i2: 222,
        si1: 12,
        vc1: 'bbb',
        // dtz1: '2023-01-01T01:02:03.345',
        time1: '23:04:06',
        // bool1: 1,
        // bool2: 1,
      },
    ];

    const arg = {
      connectionId,
      commonSchemaAndTable,
      packet,
      excludeFromInsert: ['bool2'],
      addOutputInserted: true,
    };
    const insertSql = await getInsertSqlPg(arg);
    expect(norm(insertSql)).toEqual(expectedInsertSql);
  });
});
