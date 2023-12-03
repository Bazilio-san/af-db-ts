import { getTableSchemaPg } from '../table-schema-pg';
import { prepareSqlValuePg } from '../prepare-value';
import { ITableSchemaPg } from '../../@types/i-pg';
import { schemaTable } from '../../utils/utils';
import { TDBRecord, TRecordSet } from '../../@types/i-common';

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
  const schemaTableStr = schemaTable.to.pg(commonSchemaAndTable);
  const tableSchema: ITableSchemaPg = await getTableSchemaPg(connectionId, commonSchemaAndTable);
  const { columnsSchema, pk, fieldsWoSerialsAndRO, defaults } = tableSchema;

  let mergeFieldsArr: string[] = fieldsWoSerialsAndRO;
  if (omitFields.length) {
    const set = new Set(omitFields);
    mergeFieldsArr = fieldsWoSerialsAndRO.filter((fieldName) => !set.has(fieldName));
  }

  const mergeValues = recordset.map((record: U) => {
    const preparedValues: (string | number)[] = [];

    mergeFieldsArr.forEach((f) => {
      const value = record[f];
      let sqlValue = prepareSqlValuePg({ value, fieldDef: columnsSchema[f] });
      if (defaults[f] != null && (sqlValue == null || sqlValue === 'null')) {
        sqlValue = defaults[f];
      }
      preparedValues.push(sqlValue);
    });
    return `(${preparedValues.join(', ')})`;
  }).join(',\n  ').trim();

  const updateSetStr = mergeFieldsArr.map((f) => {
    const vArr = [`EXCLUDED."${f}"`];
    if (noUpdateIfNull) {
      vArr.push(`${schemaTableStr}."${f}"`);
    }
    if (defaults[f]) {
      vArr.push(defaults[f]);
    }
    return `"${f}" = ${vArr.length > 1 ? `COALESCE(${vArr.join(', ')})` : vArr[0]}`;
  }).join(',\n  ');

  const mergeFieldsList = mergeFieldsArr.map((f) => `"${f}"`).join(',\n  ');
  // noinspection UnnecessaryLocalVariableJS
  let mergeSQL = `--
INSERT INTO ${schemaTableStr} (
  ${mergeFieldsList}
)
VALUES
  ${mergeValues}
ON CONFLICT (${pk.map((f) => `"${f}"`).join(', ')})
DO UPDATE SET
  ${updateSetStr}
;`;
  if (typeof arg.mergeCorrection === 'function') {
    mergeSQL = arg.mergeCorrection(mergeSQL);
  }
  return mergeSQL;
};
