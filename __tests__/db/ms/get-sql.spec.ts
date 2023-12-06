// noinspection SqlDialectInspection

import * as path from 'path';
import fs from 'fs';
import { getInsertSqlMs, getMergeSqlMs, getUpdateSqlMs, queryMs, TDBRecord, TRecordSet } from '../../../src';

const connectionId = 'test';
const commonSchemaAndTable = 'test.table_schema';

beforeAll(async () => {
  const sql = fs.readFileSync(path.normalize(path.join(process.cwd(), '__tests__/db/ms/ddl/test.test_table_schema.sql')), 'utf-8');
  await queryMs(connectionId, sql);
});

const norm = (s: string): string => s.replace(/\s+/sg, '');

const expectedInsertSql = norm(`
  INSERT INTO [test].[table_schema] ([i1], [i3], [si1], [vc1], [dt1], [dt2], [dtz], [time1], [bool1]) OUTPUT inserted.*
  VALUES 
    (111, NULL, 11, 'bbb', getdate(), getdate(), '2023-01-01T01:02:03.345+03:00', '23:04:06.000', 1), 
    (222, NULL, 12, 'aaa', getdate(), getdate(), getdate(), '23:04:06.000', 0);
`);

const expectedUpdateSql = norm(`
  UPDATE [test].[table_schema]
  SET
      [i2] = i2 + 134, [vc1] = 'bbb', [dtz] = '2023-01-01T01:02:03.345+03:00', [time1] = '23:04:06.000', [bool1] = 1
  WHERE [i1] = 111 AND [si1] = 11;
`);

const expectedMergeSql = norm(`MERGE [test].[table_schema]  AS target
USING
(
  SELECT * FROM ( 
    VALUES
    (111, null, 11, 'bbb', '2023-01-01T01:02:03.345+03:00', '23:04:06.000', 1),
    (222, null, 12, 'aaa', getdate(), '23:04:06.000', 0)
  )
  AS s (
    [i1],
    [i3],
    [si1],
    [vc1],
    [dtz],
    [time1],
    [bool1]
  )
)
AS source
ON target.[i1] = source.[i1] AND target.[si1] = source.[si1]

WHEN MATCHED THEN
  UPDATE SET
    target.[i3] = COALESCE(source.[i3], target.[i3]),
    target.[vc1] = COALESCE(source.[vc1], target.[vc1]),
    target.[dtz] = COALESCE(source.[dtz], target.[dtz]),
    target.[time1] = COALESCE(source.[time1], target.[time1]),
    target.[bool1] = COALESCE(source.[bool1], target.[bool1])

WHEN NOT MATCHED THEN
  INSERT (
    [i1],
    [si1],
    [vc1],
    [dtz],
    [time1],
    [bool1]
  )
  VALUES (
    source.[i1],
    source.[si1],
    source.[vc1],
    source.[dtz],
    source.[time1],
    source.[bool1]
  );

--corrected`);

describe('Sql Ms', () => {
  test('getInsertSqlMs()', async () => {
    const recordset: TRecordSet = [
      {
        i1: 111,
        i2: 122,
        si1: 11,
        vc1: 'bbb',
        dtz: '2023-01-01T01:02:03.345',
        time1: '23:04:06',
        bool1: 1,
      },
      {
        i1: 222,
        i2: 222,
        si1: 12,
        // vc1: 'bbb',
        // dtz1: '2023-01-01T01:02:03.345',
        time1: '23:04:06',
        // bool1: 1,
      },
    ];

    const arg = {
      connectionId,
      commonSchemaAndTable,
      recordset,
      excludeFromInsert: ['i2'],
      addOutputInserted: true,
    };
    const insertSql = await getInsertSqlMs(arg);
    expect(norm(insertSql)).toEqual(expectedInsertSql);
  });

  test('getUpdateSqlMs()', async () => {
    const record: TDBRecord = {
      i1: 111,
      i2: 122,
      si1: 11,
      vc1: 'bbb',
      dtz: '2023-01-01T01:02:03.345',
      time1: '23:04:06',
      bool1: 1,
    };
    const customSets: TDBRecord = { i2: `i2 + 134` };

    const arg = {
      connectionId,
      commonSchemaAndTable,
      record,
      customSets,
      // updateIdentity: [],
    };
    const updateSql = await getUpdateSqlMs(arg);
    expect(norm(updateSql)).toEqual(expectedUpdateSql);
  });

  test('getMergeSqlMs()', async () => {
    const recordset: TRecordSet = [
      {
        i1: 111,
        i2: 122,
        si1: 11,
        vc1: 'bbb',
        dtz: '2023-01-01T01:02:03.345',
        time1: '23:04:06',
        bool1: 1,
      },
      {
        i1: 222,
        i2: 222,
        si1: 12,
        // vc1: 'bbb',
        // dtz1: '2023-01-01T01:02:03.345',
        time1: '23:04:06',
        // bool1: 1,
      },
    ];

    const arg = {
      connectionId,
      commonSchemaAndTable,
      recordset,
      omitFields: ['i2', 'dt1', 'dt2'],
      excludeFromInsert: ['i3'],
      noUpdateIfNull: true,
      // withClause: 'WITH (NOLOCK)',
      // mergeIdentity: string[],
      noReturnMergeResult: true,
      mergeCorrection: (sql: string) => `${sql}\n--corrected`,
    };
    const mergeSql = await getMergeSqlMs(arg);
    expect(norm(mergeSql)).toEqual(expectedMergeSql);
  });
});
