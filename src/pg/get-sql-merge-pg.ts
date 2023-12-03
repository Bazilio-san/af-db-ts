import { getTableSchemaPg } from './table-schema-pg';
import { prepareSqlValuePg } from './prepare-value';
import { ITableSchemaPg } from '../@types/i-pg';
import { schemaTable } from '../utils';
import { TDBRecord, TRecordSet } from '../@types/i-common';

export const getMergeSqlPg = async <U extends TDBRecord = TDBRecord> (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
  recordset: TRecordSet<U>,
  omitFields?: string[],
  noUpdateIfNull?: boolean,
  mergeCorrection?: (_sql: string) => string,
}): Promise<string> => {
  const { connectionId, commonSchemaAndTable, recordset, omitFields = [], noUpdateIfNull } = arg;
  if (!recordset?.length) {
    return '';
  }
  const schemaTablePg = schemaTable.to.pg(commonSchemaAndTable);
  const tableSchema: ITableSchemaPg = await getTableSchemaPg(connectionId, commonSchemaAndTable);
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
  let mergeSQL = `${'INSERT'} INTO ${schemaTablePg}
  (${insertFieldsList.map((f) => `"${f}"`).join(', ')})
  VALUES ${insertValues}
   ON CONFLICT (${pk.map((f) => `"${f}"`).join(', ')}) 
   DO UPDATE SET ${upsertFields}
   `;
  if (typeof arg.mergeCorrection === 'function') {
    mergeSQL = arg.mergeCorrection(mergeSQL);
  }
  return mergeSQL;
};
