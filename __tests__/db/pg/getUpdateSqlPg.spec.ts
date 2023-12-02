// noinspection SqlDialectInspection

import * as path from 'path';
import fs from 'fs';
import { getUpdateSqlPg, queryPg, TDBRecord } from '../../../src';

const connectionId = 'test';
const commonSchemaAndTable = 'test.table_schema';

beforeAll(async () => {
  const sql = fs.readFileSync(path.normalize(path.join(process.cwd(), '__tests__/db/pg/ddl/test.test_table_schema.sql')), 'utf-8');
  await queryPg(connectionId, sql);
});

const norm = (s: string): string => s.replace(/\s+/sg, '');

const expectedInsertSql = norm(`
    UPDATE "test"."table_schema"
    SET "vc1"  = 'aaa',
        "dtz1" = '2022-12-31T22:02:03.345Z'::timestamptz, "time1" = '23:04:06', "bool1" = NOT bool1, "bool2" = true
    WHERE "i1" = 111 AND "si1" = 11;
`);

describe('getUpdateSqlPg()', () => {
  test('getUpdateSqlPg', async () => {
    const record: TDBRecord = {
      i1: 111,
      si1: 11,
      vc1: 'aaa',
      dtz1: '2023-01-01T01:02:03.345',
      time1: '23:04:06',
      bool1: 1,
      bool2: 1,
    };
    const customSets: TDBRecord = { bool1: `NOT bool1` };

    const arg = {
      connectionId,
      commonSchemaAndTable,
      record,
      customSets,
      // updateIdentity: [],
    };
    const updateSql = await getUpdateSqlPg(arg);
    expect(norm(updateSql)).toEqual(expectedInsertSql);
  });
});
