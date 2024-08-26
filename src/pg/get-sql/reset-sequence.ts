import { getTableSchemaPg } from '../table-schema-pg';
import { schemaTable } from '../../utils/utils';

export const getResetSequenceSqlPg = async (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
}): Promise<string> => {
  const { commonSchemaAndTable } = arg;
  const [schema, table] = schemaTable.to.common(commonSchemaAndTable).split('.');

  const { serialsFields } = await getTableSchemaPg(arg.connectionId, commonSchemaAndTable);

  // eslint-disable-next-line arrow-body-style
  return serialsFields.map((serialFieldName) => {
    return `SELECT setval(
                       pg_get_serial_sequence('"${schema}"."${table}"', '${serialFieldName}'),
                       (SELECT COALESCE(MAX("${serialFieldName}"), 1) FROM "${schema}"."${table}")
                   );`;
    // const sequenceName = `${table}_${serialFieldName}_seq`;
    // return `SELECT setval('"${schema}"."${sequenceName}"', (SELECT COALESCE(MAX("${serialFieldName}"), 1) FROM "${schema}"."${table}"));`;
  }).join('\n');
};
