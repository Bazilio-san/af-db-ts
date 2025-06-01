/* eslint-disable no-await-in-loop */
import * as path from 'path';
import * as fs from 'fs';
import { echo } from 'af-echo-ts';
import { IFieldDefPg } from '../@types/i-pg';
import { getTableSchemaPg } from './table-schema-pg';
import { closeAllPgConnectionsPg } from './pool-pg';
import { getJsTypeByTypePg } from './utils-pg';

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
): string => `${d.name}${d.isNullable || d.hasDefault ? '?' : ''}: ${getJsTypeByTypePg(d.dataType)}${d.isNullable ? ' | null' : ''}`;

const TABLE_INTERFACES_DIR = __dirname.replace(/\\/g, '/').replace(/\/dist\//, '/');

export const genTableInterfacePg = async (
  connectionId: string,
  commonSchemaAndTable: string,
  tableInterfacesDir: string = TABLE_INTERFACES_DIR,
  isSortFields: boolean = false,
): Promise<string> => {
  const tableSchema = await getTableSchemaPg(connectionId, commonSchemaAndTable);
  const interfaceName = `I${commonSchemaAndTable
    .replace('.', '_')
    .split(/_+/)
    .map((word) => (word ? word[0].toUpperCase() + word.substring(1) : ''))
    .join('')}Record`;

  let linesArr: string[] = Object.values(tableSchema.columnsSchema).map(getFieldDefinition);
  if (isSortFields) {
    linesArr = linesArr.sort();
  }
  const content = `export interface ${interfaceName} {\n${linesArr.map((v) => `  ${v}`).join(',\n')},\n}\n`;

  const fileName = `${commonSchemaAndTable.replace('.', '-').toLowerCase()}.ts`;
  const filePath = path.resolve(path.join(tableInterfacesDir, fileName));

  fs.writeFileSync(filePath, content);
  return fileName;
};

export const genTableInterfacesPg = async (
  connectionIdsAndTables: [string, string][],
  tableInterfacesDir: string = TABLE_INTERFACES_DIR,
  isSortFields: boolean = false,
): Promise<void> => {
  const interfaceFileNames: string[] = [];
  for (let i = 0; i < connectionIdsAndTables.length; i++) {
    const [connectionId, commonSchemaAndTable] = connectionIdsAndTables[i];
    const interfaceFileName = await genTableInterfacePg(connectionId, commonSchemaAndTable, tableInterfacesDir, isSortFields);
    interfaceFileNames.push(interfaceFileName);
  }
  const indexFilePath = path.resolve(path.join(tableInterfacesDir, 'index.d.ts'));
  const indexFileContent = interfaceFileNames.map((v) => `export * from './${v}';`).join('\n');
  fs.writeFileSync(indexFilePath, indexFileContent);

  echo.g(`Generated ${connectionIdsAndTables.length} table interfaces in folder '.${
    tableInterfacesDir.replace(process.cwd().replace(/\\/g, '/'), '')}/'`);
  await closeAllPgConnectionsPg();
  process.exit(0);
};
