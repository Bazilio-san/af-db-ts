// noinspection SqlResolve
import { PoolConfig } from 'pg';
import { queryPg } from './query-pg';
import { IDbOptionsPg } from '../@types/i-config';

const tableOrViewExistenceCache = new Set();

export const isTableOrViewExistsPg = async (
  arg: string | {
    connectionId: string,
    poolConfig?: PoolConfig & IDbOptionsPg,
    schemaOrFullName: string,
    tableOrViewName?: string,
  },
  schemaOrFullName?: string,
  tableOrViewName?: string,
): Promise<boolean> => {
  let poolConfig: (PoolConfig & IDbOptionsPg) | undefined;
  let connectionId: string = '';
  if (typeof arg === 'string') {
    connectionId = arg;
  } else {
    ({ connectionId, poolConfig, schemaOrFullName, tableOrViewName } = arg);
  }
  const entityName = tableOrViewName ? `${schemaOrFullName}.${tableOrViewName}` : schemaOrFullName;
  if (tableOrViewExistenceCache.has(entityName)) {
    return true;
  }
  const result = await queryPg({
    connectionId,
    poolConfig,
    sqlText: `SELECT to_regclass('${entityName}') as is_exists`,
  });
  if (result?.rows?.[0]?.is_exists) {
    tableOrViewExistenceCache.add(entityName);
    return true;
  }
  return false;
};
