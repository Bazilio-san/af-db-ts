import { getTableSchemaMs } from './table-schema-ms';
import { prepareSqlValueMs } from './prepare-value';
import { ITableSchemaMs } from '../@types/i-ms';
import { TDBRecord } from '../@types/i-common';
import { schemaTable } from '../utils';

export const getUpdateSqlMs = async (
  connectionId: string,
  commonSchemaAndTable: string,
  record: TDBRecord,
  customSets: TDBRecord = {},
): Promise<string> => {
  const tableSchema: ITableSchemaMs = await getTableSchemaMs(connectionId, commonSchemaAndTable);
  const { columnsSchema, pk, fieldsWoSerials } = tableSchema;
  const sqlValue = (fieldName: string) => prepareSqlValueMs({ value: record[fieldName], fieldDef: columnsSchema[fieldName] });
  const preparedRecord: TDBRecord = {};
  fieldsWoSerials.forEach((f) => {
    if (pk.includes(f)) {
      return;
    }
    if (customSets[f] !== undefined) {
      preparedRecord[f] = customSets[f];
    } else if (record[f] !== undefined) {
      preparedRecord[f] = sqlValue(f);
    }
  });
  const sets = Object.entries(preparedRecord).map(([f, v]) => `"${f}" = ${v}`).join(', ');
  const where = pk.map((f) => `"${f}" = ${sqlValue(f)}`).join(' AND ');
  return `${'UPDATE'} ${schemaTable.to.ms(commonSchemaAndTable)} SET
    ${sets}
  WHERE ${where};`;
};
