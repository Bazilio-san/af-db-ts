import { getTableSchemaPg } from './table-schema';
import { prepareSqlValuePg } from './prepare-value';
import { ITableSchemaPg } from '../@types/i-pg';
import { TDBRecord } from '../@types/i-common';
import { schemaTable } from '../utils';

export const getUpdateSqlPg = async (
  connectionId: string,
  commonSchemaAndTable: string,
  record: TDBRecord,
  customSets: TDBRecord = {},
): Promise<string> => {
  const tableSchema: ITableSchemaPg = await getTableSchemaPg(connectionId, commonSchemaAndTable);
  const { columnsSchema, pk, fieldsWoSerials } = tableSchema;
  const sqlValue = (fieldName: string) => prepareSqlValuePg({ value: record[fieldName], fieldDef: columnsSchema[fieldName] });
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
  return `${'UPDATE'} ${schemaTable.to.pg(commonSchemaAndTable)} SET
    ${sets}
  WHERE ${where};`;
};
