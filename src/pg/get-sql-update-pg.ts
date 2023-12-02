import { getTableSchemaPg } from './table-schema-pg';
import { prepareSqlValuePg } from './prepare-value';
import { ITableSchemaPg } from '../@types/i-pg';
import { TDBRecord } from '../@types/i-common';
import { schemaTable } from '../utils';

export const getUpdateSqlPg = async (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
  record: TDBRecord,
  customSets: TDBRecord,
  updateIdentity?: string[],
}): Promise<string> => {
  const {
    connectionId,
    commonSchemaAndTable,
    record,
    customSets = {},
  } = arg;
  const tableSchema: ITableSchemaPg = await getTableSchemaPg(connectionId, commonSchemaAndTable);
  const { columnsSchema, pk, fieldsWoSerials } = tableSchema;

  const { updateIdentity = pk } = arg;

  const updateFields = fieldsWoSerials.filter((f) => (!updateIdentity.includes(f)));

  const getPreparedSqlValue = (f: string) => prepareSqlValuePg({ value: record[f], fieldDef: columnsSchema[f] });

  const preparedRecord: TDBRecord = {};
  updateFields.forEach((f) => {
    if (customSets[f] !== undefined) {
      preparedRecord[f] = customSets[f];
    } else if (record[f] !== undefined) {
      preparedRecord[f] = getPreparedSqlValue(f);
    }
  });
  const sets = Object.entries(preparedRecord).map(([f, v]) => `"${f}" = ${v}`).join(', ');

  const where = updateIdentity.map((f) => `"${f}" = ${getPreparedSqlValue(f)}`).join(' AND ');

  return `${'UPDATE'} ${schemaTable.to.pg(commonSchemaAndTable)} SET
    ${sets}
  WHERE ${where};`;
};
