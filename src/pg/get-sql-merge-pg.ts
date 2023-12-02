import { getTableSchemaPg } from './table-schema-pg';
import { prepareSqlValuePg } from './prepare-value';
import { ITableSchemaPg } from '../@types/i-pg';
import { schemaTable } from '../utils';
import { TDBRecord } from '../@types/i-common';

export const getSqlMergePg = async <U extends TDBRecord = TDBRecord> (arg: {
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
  const schemaTablePg = schemaTable.to.pg(targetSchemaAndTable);
  const tableSchema: ITableSchemaPg = await getTableSchemaPg(connectionId, targetSchemaAndTable);
  const { columnsSchema, pk, fieldsWoSerialsAndRO, defaults } = tableSchema;

  let insertFieldsList: string[] = fieldsWoSerialsAndRO;
  if (omitFields.length) {
    const set = new Set(omitFields);
    insertFieldsList = fieldsWoSerialsAndRO.filter((fieldName) => !set.has(fieldName));
  }

  const insertValues = recordset.map((record: U) => {
    const preparedValues: (string | number)[] = [];

    insertFieldsList.forEach((fieldName) => {
      const value = record[fieldName];
      let pgSqlValue = prepareSqlValuePg({ value, fieldDef: columnsSchema[fieldName] });
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
      vArr.push(`${schemaTablePg}."${f}"`);
    }
    if (defaults[f]) {
      vArr.push(defaults[f]);
    }
    return `"${f}" = ${vArr.length > 1 ? `COALESCE(${vArr.join(', ')})` : vArr[0]}`;
  }).join(',\n');

  // noinspection UnnecessaryLocalVariableJS
  const mergeSQL = `${'INSERT'} INTO ${schemaTablePg}
  (${insertFieldsList.map((f) => `"${f}"`).join(', ')})
  VALUES ${insertValues}
   ON CONFLICT (${pk.map((f) => `"${f}"`).join(', ')}) 
   DO UPDATE SET ${upsertFields}
   `;

  return mergeSQL;
};
