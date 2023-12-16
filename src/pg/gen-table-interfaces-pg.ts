/* eslint-disable no-await-in-loop */
import * as path from 'path';
import * as fs from 'fs';
import { echo } from 'af-echo-ts';
import { IFieldDefPg } from '../@types/i-pg';
import { getTableSchemaPg } from './table-schema-pg';
import { closeAllPgConnectionsPg } from './pool-pg';
import { getJsTypeByTypePg } from './utils-pg';
import { toLower } from "lodash";

// export const getJsTypeByUdtNamePg = (udtName?: TArrayTypesPg): string => { // VVR
//   switch (udtName) {
//     case '_int2':
//     case '_int4':
//     case '_int8':
//     case '_float8':
//     case '_float4':
//     case '_numeric':
//     case '_money':
//       return 'number';
//     case '_text':
//     case '_varchar':
//       return 'string';
//     case '_bool':
//       return 'boolean';
//     case '_time':
//     case '_date':
//     case '_timestamp':
//     case '_timestamptz':
//       return '(string | Date | number)';
//     default:
//       return 'any';
//   }
// };

const getFieldDefinition = (
  d: IFieldDefPg,
): string => {
  const isOptional = d.isNullable || (d.hasDefault && !String(d.columnDefault).toLowerCase().includes('nextval'));
  return `${d.name}${isOptional ? '?' : ''}: ${getJsTypeByTypePg(d.dataType)}${d.isNullable ? ' | null' : ''}`;
};
const TABLE_INTERFACES_DIR = __dirname.replace(/\\/g, '/').replace(/\/dist\//, '/');

export const genTableInterfacePg = async (
  connectionId: string,
  commonSchemaAndTable: string,
  tableInterfacesDir: string = TABLE_INTERFACES_DIR,
): Promise<void> => {
  const tableSchema = await getTableSchemaPg(connectionId, commonSchemaAndTable);
  const interfaceName = `I${commonSchemaAndTable
    .replace('.', '_')
    .split('_')
    .map((word) => word[0].toUpperCase() + word.substring(1)).join('')}Record`;

  const linesArr = Object.values(tableSchema.columnsSchema).map(getFieldDefinition);
  const content = `export interface ${interfaceName} {\n${linesArr.map((v) => `  ${v}`).join(',\n')},\n}\n`;

  const fileName = `${commonSchemaAndTable.replace('.', '-').toLowerCase()}.ts`;
  const filePath = path.resolve(path.join(tableInterfacesDir, fileName));

  fs.writeFileSync(filePath, content);
};

export const genTableInterfacesPg = async (
  connectionId: string,
  tables: string[],
  tableInterfacesDir: string = TABLE_INTERFACES_DIR,
): Promise<void> => {
  for (let i = 0; i < tables.length; i++) {
    const commonSchemaAndTable = tables[i];
    await genTableInterfacePg(connectionId, commonSchemaAndTable, tableInterfacesDir);
  }
  echo.g(`Generated ${tables.length} table interfaces in folder '.${
    tableInterfacesDir.replace(process.cwd().replace(/\\/g, '/'), '')}/'`);
  await closeAllPgConnectionsPg();
  process.exit(0);
};
