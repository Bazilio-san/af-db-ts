// noinspection SqlResolve
import { queryPg } from './query-pg';

const tableOrViewExistenceCache = new Set();

export const isTableOrViewExistsPg = async (
  connectionId: string,
  schemaOrFullName: string,
  tableOrViewNAme?: string,
): Promise<boolean> => {
  const entityName = tableOrViewNAme ? `${schemaOrFullName}.${tableOrViewNAme}` : schemaOrFullName;
  if (tableOrViewExistenceCache.has(entityName)) {
    return true;
  }
  const result = await queryPg(connectionId, `SELECT to_regclass('${entityName}') as is_exists`);
  if (result?.rows?.[0]?.is_exists) {
    tableOrViewExistenceCache.add(entityName);
    return true;
  }
  return false;
};
