import { getTableSchemaPg } from './table-schema-pg';
import { prepareSqlValuePg } from './prepare-value';
import { ITableSchemaPg } from '../@types/i-pg';
import { TRecordSet } from '../@types/i-common';
import { schemaTable } from '../utils';

export const getInsertSqlPg = async (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
  packet: TRecordSet,
  excludeFromInsert?: string[],
  addOutputInserted?: boolean,
}): Promise<string> => {
  const { commonSchemaAndTable } = arg;

  const tableSchema: ITableSchemaPg = await getTableSchemaPg(arg.connectionId, commonSchemaAndTable);
  const { columnsSchema, fieldsWoSerials } = tableSchema;

  const insertFieldsArray = fieldsWoSerials.filter((f) => (!(arg.excludeFromInsert || []).includes(f)));
  const insertFieldsList = insertFieldsArray.map((f) => `"${f}"`).join(', ');

  const preparedRowsArray = arg.packet.map((record) => {
    const preparedRecordValuesArray = insertFieldsArray.map((f) => {
      const value = record[f];
      return value == null ? 'NULL' : prepareSqlValuePg({ value, fieldDef: columnsSchema[f] });
    });
    return preparedRecordValuesArray.join(',');
  });

  const values = preparedRowsArray.map((v) => `(${v})`).join('\n,');
  const out = arg.addOutputInserted ? ' RETURNING * ' : '';
  const target = schemaTable.to.pg(commonSchemaAndTable);
  // noinspection UnnecessaryLocalVariableJS
  const insertSQL = `INSERT INTO ${target} ${out} (${insertFieldsList})
          VALUES ${values} ON CONFLICT DO NOTHING ${out}`;
  return insertSQL;
};
