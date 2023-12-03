import { getTableSchemaMs } from './table-schema-ms';
import { prepareSqlValueMs } from './prepare-value';
import { ITableSchemaMs } from '../@types/i-ms';
import { schemaTable } from '../utils';
import { TDBRecord, TRecordSet } from '../@types/i-common';

export const getMergeSqlMs = async <U extends TDBRecord = TDBRecord> (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
  recordset: TRecordSet<U>,
  omitFields?: string[],
  excludeFromInsert?: string[],
  noUpdateIfNull?: boolean,
  withClause?: string,
  mergeIdentity?: string[], // Список полей, по которым оценивается уникальность записи. По умолчанию - поля PK
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
  const schemaTableStr = schemaTable.to.ms(commonSchemaAndTable);
  const tableSchema: ITableSchemaMs = await getTableSchemaMs(connectionId, commonSchemaAndTable);
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
      let sqlValue = prepareSqlValueMs({ value, fieldDef: columnsSchema[f] });
      if (defaults[f] != null && (sqlValue == null || sqlValue === 'null')) {
        sqlValue = defaults[f];
      }
      preparedValues.push(sqlValue);
    });
    return `(${preparedValues.join(', ')})`;
  }).join(',\n    ').trim();

  const { mergeIdentity = pk } = arg;
  if (!mergeIdentity?.length) {
    throw new Error(`The list of fields by which the uniqueness of a record is assessed is empty!`);
  }
  const onClause = mergeIdentity.map((f) => (`target.[${f}] = source.[${f}]`)).join(' AND ');

  const updateFields = mergeFieldsArr.filter((f) => (!mergeIdentity.includes(f)));

  const updateFieldsList = updateFields.map((f) => (`target.[${f}] = ${
    arg.noUpdateIfNull
      ? `COALESCE(source.[${f}], target.[${f}])`
      : `source.[${f}]`
  }`)).join(',\n    ');

  const insertFieldsArray = mergeFieldsArr.filter((f) => (!(arg.excludeFromInsert || []).includes(f)));
  const mergeFieldsList = mergeFieldsArr.map((f) => `[${f}]`).join(',\n    ');

  const insertSourceList = insertFieldsArray.map((f) => (`source.[${f}]`)).join(',\n    ');
  const insertFieldsList = insertFieldsArray.map((f) => `[${f}]`).join(',\n    ');

  let mergeSQL = `MERGE ${schemaTableStr} ${arg.withClause || ''} AS target
USING
(
  SELECT * FROM ( 
    VALUES
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
