import { getTableSchemaPg } from '../table-schema-pg';
import { schemaTable } from '../../utils/utils';

export const getResetSequenceSqlPg = async (arg: {
  connectionId: string,
  commonSchemaAndTable: string,
}): Promise<string> => {
  const { commonSchemaAndTable } = arg;
  const [schema, table] = schemaTable.to.common(commonSchemaAndTable).split('.');

  const { serialsFields } = await getTableSchemaPg(arg.connectionId, commonSchemaAndTable);

  return serialsFields.map((incFName) => {
    const sequenceName = `${table}_${incFName}_seq`;
    return `SELECT setval('"${schema}"."${sequenceName}"', (SELECT COALESCE(MAX("${incFName}"), 1) FROM "${schema}"."${table}"));`;
  }).join('\n');
};
