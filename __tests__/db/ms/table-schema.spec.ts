// noinspection SqlDialectInspection

import * as path from 'path';
import fs from 'fs';
import { genTableInterfaceMs, getTableSchemaMs, ITableSchemaMs, queryMs } from '../../../src';
import columnsSchema from './ddl/column-schema-for-test-table-schema-ms.json';

const connectionId = 'test';

let tableSchema: ITableSchemaMs;
beforeAll(async () => {
  const sql = fs.readFileSync(path.normalize(path.join(process.cwd(), '__tests__/db/ms/ddl/test.test_table_schema.sql')), 'utf-8');
  await queryMs(connectionId, sql);
  await genTableInterfaceMs(
    'test',
    'test.table_schema',
    path.normalize(path.join(process.cwd(), '__tests__/db/ms/@gen-types')),
  );
  tableSchema = await getTableSchemaMs(connectionId, 'test.table_schema');
});

describe('getTableSchemaMs()', () => {
  test('pk', async () => {
    expect(tableSchema.pk).toEqual(['i1', 'si1']);
  });
  test('uc', async () => {
    expect(tableSchema.uc).toMatchObject({
      uix__test__table_schema__time1_bool1: [
        'time1',
        'bool1',
      ],
      ux__test__table_schema__vc_tz: [
        'vc1',
        'dt1',
      ],
    });
  });
  test('defaults', async () => {
    expect(tableSchema.defaults).toEqual({
      bool1: '0',
      dt1: 'getdate()',
      dt2: 'getdate()',
      dtz: 'getdate()',
      i1: '123',
      vc1: `'aaa'`,
    });
  });

  test('fieldsList', async () => {
    expect(tableSchema.fieldsArray).toEqual([
      'ser1',
      'i1',
      'i2',
      'i3',
      'si1',
      'vc1',
      'dt1',
      'dt2',
      'dtz',
      'time1',
      'bool1',
      'comp1',
      'pers1',
    ]);
  });
  test('fieldsWoSerialsAndRO', async () => {
    expect(tableSchema.fieldsWoSerialsAndRO).toEqual([
      'i1',
      'i2',
      'i3',
      'si1',
      'vc1',
      'dt1',
      'dt2',
      'dtz',
      'time1',
      'bool1',
    ]);
  });
  test('serialsFields', async () => {
    expect(tableSchema.serialsFields).toEqual(['ser1']);
  });
  test('columnsSchema', async () => {
    const json = JSON.parse(JSON.stringify(tableSchema.columnsSchema, (k, v) => (k === 'dataType' ? v.name.toLowerCase() : v)));
    expect(json).toStrictEqual(columnsSchema);
  });
});
