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
  const { columnsSchema, fieldsWoSerials } = tableSchema;

  const insertFieldsArray = fieldsWoSerials.filter((f) => (!(arg.excludeFromInsert || []).includes(f)));
  const insertFieldsList = insertFieldsArray.map((f) => `[${f}]`).join(', ');

  const preparedRowsArray = arg.packet.map((record) => {
    const preparedRecordValuesArray = insertFieldsArray.map((f) => {
      const value = record[f];
      return value == null ? 'NULL' : prepareSqlValueMs({ value, fieldDef: columnsSchema[f] });
    });
    return preparedRecordValuesArray.join(',');
  });

  const values = preparedRowsArray.map((v) => `(${v})`).join('\n,');
  const out = arg.addOutputInserted ? ' OUTPUT inserted.* ' : '';
  const target = schemaTable.to.ms(commonSchemaAndTable);
  // noinspection UnnecessaryLocalVariableJS
  const insertSQL = `INSERT INTO ${target} ${out} (${insertFieldsList})
                     VALUES ${values}`;
  return insertSQL;
};
