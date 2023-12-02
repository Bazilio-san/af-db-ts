import { QueryResultRow } from 'pg';
import { getTableSchemaMs } from './table-schema-ms';
import { prepareSqlValueMs } from './prepare-value';
import { ITableSchemaMs } from '../@types/i-ms-new';
import { schemaTable } from '../utils';
import { prepareDataForSqlMs } from "../mssql/sql";

export const getSqlMergeMs = async <U extends QueryResultRow = QueryResultRow> (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
  recordset: U[],
  omitFields?: string[],
  noUpdateIfNull?: boolean,
}): Promise<string> => {
  const { connectionId, commonSchemaAndTable, recordset, omitFields = [], noUpdateIfNull } = arg;
  if (!recordset?.length) {
    return '';
  }
  if (prepareOptions.isPrepareForSQL) {
    prepareDataForSqlMs(packet, { recordSchema: this.schema, ...prepareOptions });
  }
  const values = `(${packet.map((r) => (fields.map((fName) => (r[fName]))
    .join(',')))
    .join(`)\n,(`)})`;
  let mergeSQL = `
MERGE ${schemaTableMs} ${withClause || ''} AS target
USING
(
    SELECT * FROM
    ( VALUES
        ${values}
    )
    AS s (
    ${fieldsList}
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
  if (!noReturnMergeResult) {
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
  return typeof mergeCorrection === 'function' ? mergeCorrection(mergeSQL) : mergeSQL;












  const schemaTableMs = schemaTable.to.ms(commonSchemaAndTable);
  const tableSchema: ITableSchemaMs = await getTableSchemaMs(connectionId, commonSchemaAndTable);
  const { columnsSchema, pk, fieldsWoSerials, defaults } = tableSchema;

  let insertFieldsList: string[] = fieldsWoSerials;
  if (omitFields.length) {
    const set = new Set(omitFields);
    insertFieldsList = fieldsWoSerials.filter((fieldName) => !set.has(fieldName));
  }

  const insertValues = recordset.map((record: U) => {
    const preparedValues: (string | number)[] = [];

    insertFieldsList.forEach((fieldName) => {
      const value = record[fieldName];
      let pgSqlValue = prepareSqlValueMs({ value, fieldDef: columnsSchema[fieldName] });
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
      vArr.push(`${schemaTableMs}."${f}"`);
    }
    if (defaults[f]) {
      vArr.push(defaults[f]);
    }
    return `"${f}" = ${vArr.length > 1 ? `COALESCE(${vArr.join(', ')})` : vArr[0]}`;
  }).join(',\n');

  // noinspection UnnecessaryLocalVariableJS
  const mergeSQL = `${'INSERT'} INTO ${schemaTableMs}
  (${insertFieldsList.map((f) => `"${f}"`).join(', ')})
  VALUES ${insertValues}
   ON CONFLICT (${pk.map((f) => `"${f}"`).join(', ')}) 
   DO UPDATE SET ${upsertFields}
   `;

  return mergeSQL;
};
