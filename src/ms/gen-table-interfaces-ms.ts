/* eslint-disable no-await-in-loop */
import * as path from 'path';
import * as fs from 'fs';
import { echo } from 'af-echo-ts';
import { IFieldDefMs } from '../@types/i-ms';
import { getTableSchemaMs } from './table-schema-ms';
import { closeAllDbConnectionsMs } from './pool-ms';
import { schemaTable } from '../utils/utils';
import { getJsTypeByTypeMs } from './utils-ms';

const getFieldDefinition = (d: IFieldDefMs): string => {
  const fieldName = d.name + (d.isNullable || d.hasDefault ? '?' : '');
  return `${fieldName}: ${getJsTypeByTypeMs(d.dataType, d.arrayType)}${d.isNullable ? ' | null' : ''}`;
};

const TABLE_INTERFACES_DIR = __dirname.replace(/\\/g, '/').replace(/\/dist\//, '/');

export const genTableInterfaceMs = async (
  connectionId: string,
  commonSchemaAndTable: string,
  tableInterfacesDir: string = TABLE_INTERFACES_DIR,
): Promise<void> => {
  const tableSchema = await getTableSchemaMs(connectionId, commonSchemaAndTable);
  const interfaceName = `I${schemaTable.to.common(commonSchemaAndTable)
    .replace('.', '_')
    .split('_')
    .map((word) => word[0].toUpperCase() + word.substring(1))
    .join('')}Record`;

  const linesArr = Object.values(tableSchema.columnsSchema).map(getFieldDefinition);
  const content = `export interface ${interfaceName} {\n${linesArr.map((v) => `  ${v}`).join(',\n')},\n}\n`;

  const fileName = `${commonSchemaAndTable.replace('.', '-').toLowerCase()}.ts`;
  const filePath = path.resolve(path.join(tableInterfacesDir, fileName));

  fs.writeFileSync(filePath, content);
};

export const genTableInterfacesMs = async (
  connectionId: string,
  tables: string[],
  tableInterfacesDir: string = TABLE_INTERFACES_DIR,
): Promise<void> => {
  for (let i = 0; i < tables.length; i++) {
    const commonSchemaAndTable = tables[i];
    await genTableInterfaceMs(connectionId, commonSchemaAndTable, tableInterfacesDir);
  }
  echo.g(`Generated ${tables.length} table interfaces in folder '.${
    tableInterfacesDir.replace(process.cwd().replace(/\\/g, '/'), '')}/'`);
  await closeAllDbConnectionsMs();
  process.exit(0);
};
