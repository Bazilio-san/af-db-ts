import { getTableSchemaMs } from './table-schema-ms';
import { prepareSqlValueMs } from './prepare-value';
import { ITableSchemaMs } from '../@types/i-ms';
import { TRecordSet } from '../@types/i-common';
import { schemaTable } from '../utils';

export const getInsertSqlMs = async (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
  packet: TRecordSet,
  excludeFromInsert?: string[],
  addOutputInserted?: boolean,
}): Promise<string> => {
  const { commonSchemaAndTable } = arg;

  const tableSchema: ITableSchemaMs = await getTableSchemaMs(arg.connectionId, commonSchemaAndTable);
  const { columnsSchema, fieldsWoSerialsAndRO, defaults } = tableSchema;

  const insertFieldsArray = fieldsWoSerialsAndRO.filter((f) => (!(arg.excludeFromInsert || []).includes(f)));
  const insertFieldsList = insertFieldsArray.map((f) => `[${f}]`).join(', ');

  const preparedRowsArray = arg.packet.map((record) => {
    const preparedRecordValuesArray = insertFieldsArray.map((f) => {
      const value = record[f];
      const fieldDef = columnsSchema[f];
      if (value != null) {
        return prepareSqlValueMs({ value, fieldDef });
      }
      const defVal = defaults[f];
      if (!fieldDef.isNullable && defVal != null) {
        return defVal;
      }
      return 'NULL';
    });
    return preparedRecordValuesArray.join(',');
  });

  const values = preparedRowsArray.map((v) => `(${v})`).join('\n,');
  const out = arg.addOutputInserted ? ' OUTPUT inserted.* ' : '';
  const target = schemaTable.to.ms(commonSchemaAndTable);
  // noinspection UnnecessaryLocalVariableJS
  const insertSQL = `INSERT INTO ${target} (${insertFieldsList}) ${out}
                     VALUES ${values}`;
  return insertSQL;
};
