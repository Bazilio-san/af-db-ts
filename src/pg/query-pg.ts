import { QueryResult } from 'pg';
import { getPoolPg } from './pool-pg';
import { logSqlError } from '../common';
import { IPoolPg } from '../@types/i-pg';
import { TDBRecord } from '../@types/i-common';

export const queryPg = async <R extends TDBRecord = any> (
  connectionId: string,
  sqlText: string,
  sqlValues?: any[],
  throwError?: boolean,
  prefix?: string,
):
  Promise<QueryResult<R> | undefined> => {
  try {
    const pool: IPoolPg = await getPoolPg(connectionId, throwError);
    let res: QueryResult;
    if (Array.isArray(sqlValues)) {
      res = await pool.query(sqlText, sqlValues);
    } else {
      res = await pool.query(sqlText);
    }
    return res;
  } catch (err) {
    logSqlError(err, throwError, sqlText, prefix);
  }
};
