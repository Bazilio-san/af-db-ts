// noinspection SqlDialectInspection

import * as path from 'path';
import fs from 'fs';
import { getTableSchemaPg, ITableSchemaPg, queryPg } from '../../../src';
import { genTableInterfacePg } from '../../../src/pg/gen-table-interfaces-pg';
import columnsSchema from './ddl/column-schema-for-test-table-schema-pg.json';

const connectionId = 'test';

let tableSchema: ITableSchemaPg;
beforeAll(async () => {
  const sql = fs.readFileSync(path.normalize(path.join(process.cwd(), '__tests__/db/pg/ddl/test.test_table_schema.sql')), 'utf-8');
  await queryPg(connectionId, sql);
  await genTableInterfacePg(
    'test',
    'test.table_schema',
    path.normalize(path.join(process.cwd(), '__tests__/db/pg/@gen-types')),
  );
  tableSchema = await getTableSchemaPg(connectionId, 'test.table_schema');
});

describe('getTableSchemaPg()', () => {
  test('pk', async () => {
    expect(tableSchema.pk).toEqual(['i1', 'si1']);
  });
  test('uc', async () => {
    expect(tableSchema.uc).toEqual({
      ux__test__fable_schema__vc_tz: [
        'dtz1',
        'vc1',
      ],
      uix__test__fable_schema__time1_bool1: [
        'bool1',
        'time1',
      ],
    });
  });
  test('defaults', async () => {
    expect(tableSchema.defaults).toEqual({
      i1: '25',
      dtz1: 'CURRENT_TIMESTAMP',
      permanent: 'false',
    });
  });

  test('fieldsList', async () => {
    expect(tableSchema.fieldsArray).toEqual([
      'ser1',
      'ser2',
      'i1',
      'si1',
      'vc1',
      'dtz1',
      'time1',
      'bool1',
      'permanent',
    ]);
  });
  test('fieldsWoSerials', async () => {
    expect(tableSchema.fieldsWoSerials).toEqual([
      'i1',
      'si1',
      'vc1',
      'dtz1',
      'time1',
      'bool1',
      'permanent',
    ]);
  });
  test('serials', async () => {
    expect(tableSchema.serials).toEqual(['ser1', 'ser2']);
  });
  test('columnsSchema', async () => {
    expect(tableSchema.columnsSchema).toMatchObject(columnsSchema);
  });
});
