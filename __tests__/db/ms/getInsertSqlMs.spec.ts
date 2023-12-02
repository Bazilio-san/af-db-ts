// noinspection SqlDialectInspection

import * as path from 'path';
import fs from 'fs';
import { getInsertSqlMs, queryMs, TRecordSet } from '../../../src';

const connectionId = 'test';
const commonSchemaAndTable = 'test.table_schema';

beforeAll(async () => {
  const sql = fs.readFileSync(path.normalize(path.join(process.cwd(), '__tests__/db/ms/ddl/test.test_table_schema.sql')), 'utf-8');
  await queryMs(connectionId, sql);
});

const norm = (s: string): string => s.replace(/\s+/sg, '');

const expectedInsertSql = norm(`
    INSERT INTO [test].[table_schema] ([i1], [si1], [vc1], [dtz1], [time1], [bool1]) OUTPUT inserted.*
    VALUES (111, 11, 'bbb', '2023-01-01T01:02:03.345', '23:04:06.000', 1), (222, 12, 'aaa', getdate(), '23:04:06.000', 0)
`);

describe('getInsertSqlMs()', () => {
  test('getInsertSqlMs', async () => {
    const packet: TRecordSet = [
      {
        i1: 111,
        i2: 122,
        si1: 11,
        vc1: 'bbb',
        dtz1: '2023-01-01T01:02:03.345',
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
      packet,
      excludeFromInsert: ['i2'],
      addOutputInserted: true,
    };
    const insertSql = await getInsertSqlMs(arg);
    expect(norm(insertSql)).toEqual(expectedInsertSql);
  });
});
