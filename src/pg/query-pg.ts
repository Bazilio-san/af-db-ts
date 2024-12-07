import { PoolConfig, QueryResult } from 'pg';
import { getPoolPg } from './pool-pg';
import { logSqlError } from '../common';
import { IPoolPg } from '../@types/i-pg';
import { TDBRecord } from '../@types/i-common';
import { IDbOptionsPg, IRegisterTypeFn } from '../@types/i-config';

export const queryPg = async <R extends TDBRecord = any> (
  arg: string | {
    connectionId: string,
    poolConfig?: PoolConfig & IDbOptionsPg,
    sqlText: string,
    sqlValues?: any[],
    throwError?: boolean,
    prefix?: string,
    registerTypesFunctions?: IRegisterTypeFn[],
  },
  sqlText?: string,
  sqlValues?: any[],
  throwError?: boolean,
  prefix?: string,
  registerTypesFunctions?: IRegisterTypeFn[],
):
  Promise<QueryResult<R> | undefined> => {
  let poolConfig: (PoolConfig & IDbOptionsPg) | undefined;
  let connectionId: string = '';
  if (typeof arg === 'string') {
    connectionId = arg;
  } else {
    ({ connectionId, poolConfig, sqlText, sqlValues, throwError, prefix, registerTypesFunctions } = arg);
  }
  try {
    const pool: IPoolPg = await getPoolPg({ connectionId, poolConfig, throwError, registerTypesFunctions });
    let res: QueryResult;
    if (Array.isArray(sqlValues)) {
      res = await pool.query(sqlText || '', sqlValues);
    } else {
      res = await pool.query(sqlText || '');
    }
    return res;
  } catch (err) {
    logSqlError(err, throwError, sqlText, prefix);
  }
};
