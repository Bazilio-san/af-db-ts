// noinspection SqlDialectInspection

import * as path from 'path';
import fs from 'fs';
import { getInsertSqlPg, getMergeSqlPg, getUpdateSqlPg, queryPg, TDBRecord, TRecordSet } from '../../../src';

const connectionId = 'test';
const commonSchemaAndTable = 'test.table_schema';

beforeAll(async () => {
  const sql = fs.readFileSync(path.normalize(path.join(process.cwd(), '__tests__/db/pg/ddl/test.test_table_schema.sql')), 'utf-8');
  await queryPg(connectionId, sql);
});

const norm = (s: string): string => s.replace(/\s+/sg, '');

const expectedInsertSql = norm(`
  INSERT INTO "test"."table_schema" ("i1", "i2", "si1", "vc1", "dtz1", "time1", "bool1")
  VALUES (111, NULL, 11, 'aaa', '2023-01-01T01:02:03.345+03:00'::timestamptz, '23:04:06', true)
       , (222, 222, 12, 'bbb', CURRENT_TIMESTAMP, '23:04:06', true) ON CONFLICT DO NOTHING  RETURNING *;
`);

const expectedUpdateSql = norm(`
  UPDATE "test"."table_schema"
  SET "vc1"  = 'aaa',
      "dtz1" = '2023-01-01T01:02:03.345+03:00'::timestamptz, "time1" = '23:04:06', "bool1" = NOT bool1, "bool2" = true
  WHERE "i1" = 111 AND "si1" = 11;
`);

const expectedMergeSql = norm(`
--
INSERT INTO "test"."table_schema" (
  "i1",
  "si1",
  "vc1",
  "dtz1",
  "time1",
  "bool1",
  "bool2"
)
VALUES
  (111, 11, 'aaa', '2023-01-01T01:02:03.345+03:00'::timestamptz, '23:04:06', false, true),
  (222, 12, 'bbb', CURRENT_TIMESTAMP, '23:04:06', true, false)
ON CONFLICT ("i1", "si1")
DO UPDATE SET
  "i1" = COALESCE(EXCLUDED."i1", "test"."table_schema"."i1", 25),
  "si1" = COALESCE(EXCLUDED."si1", "test"."table_schema"."si1"),
  "vc1" = COALESCE(EXCLUDED."vc1", "test"."table_schema"."vc1"),
  "dtz1" = COALESCE(EXCLUDED."dtz1", "test"."table_schema"."dtz1", CURRENT_TIMESTAMP),
  "time1" = COALESCE(EXCLUDED."time1", "test"."table_schema"."time1"),
  "bool1" = COALESCE(EXCLUDED."bool1", "test"."table_schema"."bool1", true),
  "bool2" = COALESCE(EXCLUDED."bool2", "test"."table_schema"."bool2", false)
;
--corrected`);

describe('Sql Pg', () => {
  test('getInsertSqlPg()', async () => {
    const recordset: TRecordSet = [
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
      recordset,
      excludeFromInsert: ['bool2'],
      addOutputInserted: true,
    };
    const insertSql = await getInsertSqlPg(arg);
    expect(norm(insertSql)).toEqual(expectedInsertSql);
  });

  test('getUpdateSqlPg()', async () => {
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
    expect(norm(updateSql)).toEqual(expectedUpdateSql);
  });

  test('getMergeSqlPg()', async () => {
    const recordset: TRecordSet = [
      {
        i1: 111,
        si1: 11,
        vc1: 'aaa',
        dtz1: '2023-01-01T01:02:03.345',
        time1: '23:04:06',
        bool1: false,
        bool2: true,
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
      recordset,
      omitFields: ['i2'],
      noUpdateIfNull: true,
      mergeCorrection: (sql: string) => `${sql}\n--corrected`,
    };
    const mergeSql = await getMergeSqlPg(arg);
    expect(norm(mergeSql)).toEqual(expectedMergeSql);
  });
});
