import { getTableSchemaPg } from '../table-schema-pg';
import { prepareSqlValuePg } from '../prepare-value';
import { ITableSchemaPg } from '../../@types/i-pg';
import { TDBRecord, TRecordSet } from '../../@types/i-common';
import { schemaTable } from '../../utils/utils';
import { NULL } from '../../common';

export const getInsertSqlPg = async <U extends TDBRecord = TDBRecord> (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
  recordset: TRecordSet<U>,
  excludeFromInsert?: string[],
  addOutputInserted?: boolean,
  isErrorOnConflict?: boolean,
}): Promise<string> => {
  const { commonSchemaAndTable } = arg;

  const tableSchema: ITableSchemaPg = await getTableSchemaPg(arg.connectionId, commonSchemaAndTable);
  const { columnsSchema, fieldsWoSerialsAndRO, defaults } = tableSchema;

  const insertFieldsArray = fieldsWoSerialsAndRO.filter((f) => (!(arg.excludeFromInsert || []).includes(f)));
  const insertFieldsList = insertFieldsArray.map((f) => `"${f}"`).join(', ');

  const preparedRowsArray = arg.recordset.map((record) => {
    const preparedRecordValuesArray = insertFieldsArray.map((f) => {
      const value = record[f];
      const fieldDef = columnsSchema[f];
      if (value != null) {
        return prepareSqlValuePg({ value, fieldDef });
      }
      const defVal = defaults[f];
      if (!fieldDef.isNullable && defVal != null) {
        return defVal;
      }
      return NULL;
    });
    return preparedRecordValuesArray.join(',');
  });

  const values = preparedRowsArray.map((v) => `(${v})`).join('\n,');
  const out = arg.addOutputInserted ? ' RETURNING * ' : '';
  const target = schemaTable.to.pg(commonSchemaAndTable);
  // noinspection UnnecessaryLocalVariableJS
  const insertSQL = `INSERT INTO ${target} (${insertFieldsList})
                     VALUES ${values}${arg.isErrorOnConflict ? '' : 'ON CONFLICT DO NOTHING'} ${out};`;
  return insertSQL;
};
