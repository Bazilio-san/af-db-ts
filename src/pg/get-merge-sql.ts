import { QueryResultRow } from 'pg';
import { getTableSchemaPg } from './table-schema';
import { prepareSqlValuePg } from './prepare-value';
import { ITableSchemaPg } from '../@types/i-pg';

export const getMergeSqlPg = async <U extends QueryResultRow = QueryResultRow> (arg: {
  connectionId: string,
  targetSchemaAndTable: string,
  recordset: U[],
  omitFields?: string[],
  noUpdateIfNull?: boolean,
}): Promise<string> => {
  const { connectionId, targetSchemaAndTable, recordset, omitFields = [], noUpdateIfNull } = arg;
  if (!recordset?.length) {
    return '';
  }
  const tableSchema: ITableSchemaPg = await getTableSchemaPg(connectionId, targetSchemaAndTable);
  const { recordSchema, pk, fieldsWoSerials, defaults } = tableSchema;

  let insertFieldsList: string[] = fieldsWoSerials;
  if (omitFields.length) {
    const set = new Set(omitFields);
    insertFieldsList = fieldsWoSerials.filter((fieldName) => !set.has(fieldName));
  }

  const insertValues = recordset.map((record: U) => {
    const preparedValues: (string | number)[] = [];

    insertFieldsList.forEach((fieldName) => {
      const value = record[fieldName];
      let pgSqlValue = prepareSqlValuePg({ value, fieldDef: recordSchema[fieldName] });
      if (defaults[fieldName] != null && pgSqlValue === 'null') {
        pgSqlValue = defaults[fieldName];
      }
      preparedValues.push(pgSqlValue);
    });
    return `(${preparedValues.join(', ')})`;
  }).join(',\n').trim();

  const upsertFields = insertFieldsList.map((f) => {
    const vArr = [`EXCLUDED."${f}"`];
    if (noUpdateIfNull) {
      vArr.push(`${targetSchemaAndTable}."${f}"`);
    }
    if (defaults[f]) {
      vArr.push(defaults[f]);
    }
    return `"${f}" = ${vArr.length > 1 ? `COALESCE(${vArr.join(', ')})` : vArr[0]}`;
  }).join(',\n');

  // noinspection UnnecessaryLocalVariableJS
  const mergeSQL = `${'INSERT'} INTO ${targetSchemaAndTable}
  (${insertFieldsList.map((f) => `"${f}"`).join(', ')})
  VALUES ${insertValues}
   ON CONFLICT (${pk.map((f) => `"${f}"`).join(', ')}) 
   DO UPDATE SET ${upsertFields}
   `;

  return mergeSQL;
};
