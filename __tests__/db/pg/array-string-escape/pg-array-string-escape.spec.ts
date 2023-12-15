import { DateTime } from 'luxon';
import moment from 'moment';
import { arrayToJsonList } from '../../../../src/utils/utils-array';
import { getInsertSqlPg, queryPg } from '../../../../src';

const connectionId = 'test';
const commonSchemaAndTable = 'test.array_strings';

const queryTest = (sql: string) => queryPg(connectionId, sql);

describe('Array string escape', () => {
  describe('arrayToJsonList()', () => {
    const testArr: [any[], string][] = [
      [[1, 0, true, false], `"1","0","true","false"`],
      [[{ a: 'w' }, [1, 'r']], `null,null`],
      [[
        new Date(1702621900066),
        moment(1702621900066),
        DateTime.fromMillis(1702621900066),
      ], `"2023-12-15T06:31:40.066Z","2023-12-15T06:31:40.066Z","2023-12-15T06:31:40.066Z"`],
      [[1, `a"b"c'd'e\\f$$g`], `"1","a\\"b\\"c'd'e\\\\f$$g"`],
      // [[`a"b"c'd'e\\f$$g`], `$s$\{"aaa","a\\"b\\"c'd'e\\\\f$$g"}$s$`],
    ];
    testArr.forEach((caseValues) => {
      const [inArr, expected] = caseValues;
      const v = JSON.stringify(inArr);
      test(`${v}`, () => {
        const list = arrayToJsonList(inArr, 'text');
        expect(list).toBe(expected);
      });
    });
  });
  describe('complex test', () => {
    test(`test`, async () => {
      const dropTableSql = `---
        DROP TABLE IF EXISTS ${commonSchemaAndTable};`;
      const truncateTableSQL = `---
        TRUNCATE TABLE ${commonSchemaAndTable};`;
      const createTableSql = `---
        CREATE TABLE IF NOT EXISTS ${commonSchemaAndTable}
        (
          id int,
          ct text[]
        );`;
      await queryTest(dropTableSql);
      await queryTest(createTableSql);
      await queryTest(truncateTableSQL);
      const recordset = [
        {
          id: 1,
          ct: [
            1, 0,
            true, false,
            { a: 'w' }, [1, 'r'],
            new Date(1702621900066),
            moment(1702621900066),
            DateTime.fromMillis(1702621900066),
            `a"b"c'd'e\\f$$g`,
          ],
        },
        {
          id: 2,
          ct: [`ООО "Бодрый Бобёр"`],
        },
      ];
      const expected = [
        '1', '0',
        'true', 'false',
        null, null,
        '2023-12-15T06:31:40.066Z',
        '2023-12-15T06:31:40.066Z',
        '2023-12-15T06:31:40.066Z',
        `a"b"c'd'e\\f$$g`,
      ];
      const insertSql = await getInsertSqlPg({ connectionId, commonSchemaAndTable, recordset });
      await queryTest(insertSql);
      const res = await queryTest(`---
      SELECT ct FROM ${commonSchemaAndTable} ORDER BY id`);
      const val = (res?.rows || [])[0]?.ct;
      (val || []).forEach((v: any, index: number) => {
        expect(v).toBe(expected[index]);
      });
      const val2 = (res?.rows || [])[1]?.ct?.[0];
      expect(val2).toBe(`ООО "Бодрый Бобёр"`);
    });
  });
});
