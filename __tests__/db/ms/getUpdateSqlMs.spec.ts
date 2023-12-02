// noinspection SqlDialectInspection

import * as path from 'path';
import fs from 'fs';
import { getUpdateSqlMs, queryMs, TDBRecord } from '../../../src';

const connectionId = 'test';
const commonSchemaAndTable = 'test.table_schema';

beforeAll(async () => {
  const sql = fs.readFileSync(path.normalize(path.join(process.cwd(), '__tests__/db/ms/ddl/test.test_table_schema.sql')), 'utf-8');
  await queryMs(connectionId, sql);
});

const norm = (s: string): string => s.replace(/\s+/sg, '');

const expectedInsertSql = norm(`
    UPDATE [test].[table_schema] SET
        [i2] = i2 + 134, [vc1] = 'bbb', [dtz1] = '2023-01-01T01:02:03.345', [time1] = '23:04:06.000', [bool1] = 1
    WHERE [i1] = 111 AND [si1] = 11;
`);

describe('getUpdateSqlMs()', () => {
  test('getUpdateSqlMs', async () => {
    const record: TDBRecord = {
      i1: 111,
      i2: 122,
      si1: 11,
      vc1: 'bbb',
      dtz1: '2023-01-01T01:02:03.345',
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
    expect(norm(updateSql)).toEqual(expectedInsertSql);
  });
});
