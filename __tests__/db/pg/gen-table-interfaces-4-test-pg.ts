import * as path from 'path';
import { genTableInterfacesPg } from '../../../src';

const tables = [
  'test.hard_case',
  'test.only_one_serial',
  'test.only_one_uniq',
  'test.serial_and_uniq',
  'test.table_schema',
];

genTableInterfacesPg(
  tables.map((schemaAndTable) => ['test', schemaAndTable]),
  path.normalize(path.join(process.cwd(), '__tests__/db/pg/@gen-types')),
).then(() => 0);
