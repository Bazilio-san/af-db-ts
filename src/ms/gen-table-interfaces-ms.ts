/* eslint-disable no-await-in-loop */
import * as path from 'path';
import * as fs from 'fs';
import * as sql from 'mssql';
import { echo } from 'af-echo-ts';
import { IFieldDefMs } from '../@types/i-ms';
import { getTableSchemaMs } from './table-schema-ms';
import { closeAllDbConnectionsMs } from './pool-ms';
import { schemaTable } from '../utils/utils';

const getJsTypeByFieldDef = (fieldDef: IFieldDefMs): string => {
  switch (fieldDef.dataType) {
    case 'boolean':
    case sql.Bit:
      return 'boolean';

    case 'bigint':
    case sql.BigInt:
      return 'string | number';

    case 'tinyint':
    case sql.TinyInt:
    case 'smallint':
    case sql.SmallInt:
    case 'int':
    case 'integer':
    case sql.Int:
    case 'number':
    case sql.Decimal:
    case sql.Float:
    case sql.Money:
    case sql.Numeric:
    case sql.SmallMoney:
    case sql.Real:
      return 'number';

    case 'string':
    case sql.Char:
    case sql.NChar:
    case sql.Text:
    case sql.NText:
    case sql.VarChar:
    case sql.NVarChar:
    case sql.Xml:
    case 'uid':
    case 'uuid':
    case 'uniqueIdentifier':
    case sql.UniqueIdentifier:
      return 'string';

    case 'datetime':
    case 'date':
    case 'time':
    case sql.DateTime:
    case sql.DateTime2:
    case sql.Time:
    case sql.Date:
    case sql.SmallDateTime:
    case sql.DateTimeOffset:
      return 'string | Date | number';

    case sql.Binary:
    case sql.VarBinary:
    case sql.Image:
      return 'any';

    case sql.UDT:
    case sql.Geography:
    case sql.Geometry:
    case sql.Variant:
      return 'any';
    default:
      return 'string';
  }
};

const getFieldDefinition = (
  d: IFieldDefMs,
): string => `${d.name}${d.isNullable || d.hasDefault ? '?' : ''}: ${getJsTypeByFieldDef(d)}${d.isNullable ? ' | null' : ''}`;

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
