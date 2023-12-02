import { getTableSchemaMs } from './table-schema-ms';
import { prepareSqlValueMs } from './prepare-value';
import { ITableSchemaMs } from '../@types/i-ms';
import { schemaTable } from '../utils';
import { TDBRecord } from '../@types/i-common';

export const getSqlMergeMs = async <U extends TDBRecord = TDBRecord> (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
  recordset: U[],
  omitFields?: string[],
  excludeFromInsert?: string[],
  noUpdateIfNull?: boolean,
  withClause?: string,
  mergeIdentity?: string[][], // Может быть несколько альтернативных уникальных наборов полей
  noReturnMergeResult?: boolean,
  mergeCorrection?: (_sql: string) => string,
}): Promise<string> => {
  const {
    connectionId,
    commonSchemaAndTable,
    recordset,
    omitFields = [],
  } = arg;
  if (!recordset?.length) {
    return '';
  }
  const schemaTableMs = schemaTable.to.ms(commonSchemaAndTable);
  const tableSchema: ITableSchemaMs = await getTableSchemaMs(connectionId, commonSchemaAndTable);
  const { columnsSchema, pk, fieldsWoSerialsAndRO, defaults, uc } = tableSchema;
  let mergeFieldsList: string[] = fieldsWoSerialsAndRO;
  if (omitFields.length) {
    const set = new Set(omitFields);
    mergeFieldsList = fieldsWoSerialsAndRO.filter((fieldName) => !set.has(fieldName));
  }

  const mergeValues = recordset.map((record: U) => {
    const preparedValues: (string | number)[] = [];

    mergeFieldsList.forEach((fieldName) => {
      const value = record[fieldName];
      let sqlValueMs = prepareSqlValueMs({ value, fieldDef: columnsSchema[fieldName] });
      if (defaults[fieldName] != null && sqlValueMs === 'null') {
        sqlValueMs = defaults[fieldName];
      }
      preparedValues.push(sqlValueMs);
    });
    return `(${preparedValues.join(', ')})`;
  }).join(',\n').trim();

  if (!arg.mergeIdentity) {
    arg.mergeIdentity = [];
    if (pk?.length) {
      arg.mergeIdentity.push(pk);
    }
    const ucl = Object.values(uc || {}).filter((arr) => arr.length);
    if (ucl.length) {
      arg.mergeIdentity.push(...ucl);
    }
  }
  const onClauseAlters: string[] = [];
  const mergeIdentityFields: string[] = [];
  arg.mergeIdentity.forEach((uFieldsArr) => {
    const s = uFieldsArr.map((f) => (`target.[${f}] = source.[${f}]`)).join(' AND ');
    onClauseAlters.push(`(${s})`);
    mergeIdentityFields.push(...uFieldsArr);
  });
  const onClause = `( ${onClauseAlters.join(' OR ')} )`;

  const mergeIdentitySet = new Set(mergeIdentityFields);
  const updateFields = mergeFieldsList.filter((f) => (!mergeIdentitySet.has(f)));

  const updateFieldsList = updateFields.map((f) => (`target.[${f}] = ${
    arg.noUpdateIfNull
      ? `COALESCE(source.[${f}], target.[${f}])`
      : `source.[${f}]`
  }`)).join(', ');

  const insertFieldsArray = mergeFieldsList.filter((f) => (!(arg.excludeFromInsert || []).includes(f)));

  const insertSourceList = insertFieldsArray.map((f) => (`source.[${f}]`)).join(', ');
  const insertFieldsList = insertFieldsArray.map((f) => `[${f}]`).join(', ');

  let mergeSQL = `
MERGE ${schemaTableMs} ${arg.withClause || ''} AS target
USING
(
    SELECT * FROM
    ( VALUES
        ${mergeValues}
    )
    AS s (
    ${mergeFieldsList}
    )
)
AS source
ON ${onClause}
WHEN MATCHED THEN
    UPDATE SET
        ${updateFieldsList}
    WHEN NOT MATCHED THEN
        INSERT (
        ${insertFieldsList}
        )
        VALUES (
        ${insertSourceList}
        )`;

  if (!arg.noReturnMergeResult) {
    mergeSQL = `
${'DECLARE'} @t TABLE ( act VARCHAR(20));
DECLARE @total AS INTEGER;
DECLARE @i AS INTEGER;
DECLARE @u AS INTEGER;
${mergeSQL}
OUTPUT $action INTO @t;
SET @total = @@ROWCOUNT;
SELECT @i = COUNT(*) FROM @t WHERE act = 'INSERT';
SELECT @u = COUNT(*) FROM @t WHERE act != 'INSERT';
SELECT @total as total, @i as inserted, @u as updated;
`;
  } else {
    mergeSQL += `;\n`;
  }
  if (typeof arg.mergeCorrection === 'function') {
    mergeSQL = arg.mergeCorrection(mergeSQL);
  }
  return mergeSQL;
};
