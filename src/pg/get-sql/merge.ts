import { getTableSchemaPg } from '../table-schema-pg';
import { prepareSqlValuePg } from '../prepare-value';
import { ITableSchemaPg } from '../../@types/i-pg';
import { schemaTable } from '../../utils/utils';
import { TDBRecord, TRecordSet } from '../../@types/i-common';

export const getMergeSqlPg = async <U extends TDBRecord = TDBRecord> (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
  recordset: TRecordSet<U>,
  /**
   * Поля массива conflictFields будут указаны в части ON CONFLICT (<conflictFields>)
   * Если conflictFields НЕ ПЕРЕДАН, то в части ON CONFLICT будут перечислены поля, входящие в Primary Kеy.
   */
  conflictFields?: string[],
  /**
   * omitFields: Эти поля будут исключены и из INSERT части и из UPDATE части.
   * За исключением случая, когда передан массив updateFields, на него omitFields не влияет
   */
  omitFields?: string[],
  /**
   * Если массив полей updateFields указан, то именно эти поля будут участвовать в части DO UPDATE
   * За вычитом полей в fieldsExcludedFromUpdatePart
   * Если updateFields НЕ УКАЗАН, то в UPDATE части будут присутсьвовать все поля,
   * за минусом автоинкрементных, RO, omitFields и fieldsExcludedFromUpdatePart
   */
  updateFields?: string[],
  fieldsExcludedFromUpdatePart?: string[],
  noUpdateIfNull?: boolean,
  mergeCorrection?: (_sql: string) => string,
  returning?: string, // '*' | ' "anyFieldName1", "anyFieldName2"'
}): Promise<string> => {
  const {
    connectionId,
    commonSchemaAndTable,
    recordset,
    omitFields = [],
    noUpdateIfNull,
    fieldsExcludedFromUpdatePart = [],
    returning,
  } = arg;
  if (!recordset?.length) {
    return '';
  }
  const schemaTableStr = schemaTable.to.pg(commonSchemaAndTable);
  const tableSchema: ITableSchemaPg = await getTableSchemaPg(connectionId, commonSchemaAndTable);
  const { columnsSchema, pk, fieldsWoSerialsAndRO, defaults } = tableSchema;

  const conflictFields = arg.conflictFields || pk;

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

  let updateFieldsArr: string[] = arg.updateFields || mergeFieldsArr;
  if (fieldsExcludedFromUpdatePart?.length) {
    const set = new Set(fieldsExcludedFromUpdatePart);
    updateFieldsArr = mergeFieldsArr.filter((fieldName) => !set.has(fieldName));
  }

  const updateSetStr = updateFieldsArr.map((f) => {
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
ON CONFLICT (${conflictFields.map((f) => `"${f}"`).join(', ')})
DO UPDATE SET
  ${updateSetStr}
  ${returning ? `RETURNING ${returning}` : ''}
;`;
  if (typeof arg.mergeCorrection === 'function') {
    mergeSQL = arg.mergeCorrection(mergeSQL);
  }
  return mergeSQL;
};
