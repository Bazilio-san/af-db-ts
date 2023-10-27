import { getTableSchemaPg } from './table-schema';
import { prepareSqlValuePg } from './prepare-value';
import { ITableSchemaPg } from '../@types/i-pg';
import { TDBRecord } from '../@types/i-common';

export const getUpdateSqlPg = async (
  connectionId: string,
  schemaAndTable: string,
  record: TDBRecord,
  customSets: TDBRecord = {},
): Promise<string> => {
  const tableSchema: ITableSchemaPg = await getTableSchemaPg(connectionId, schemaAndTable);
  const { recordSchema, pk, fieldsWoSerials } = tableSchema;
  const sqlValue = (fieldName: string) => prepareSqlValuePg({ value: record[fieldName], fieldDef: recordSchema[fieldName] });
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
  return `${'UPDATE'} ${schemaAndTable} SET
    ${sets}
  WHERE ${where};`;
};
