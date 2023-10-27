import { QueryResult, QueryResultRow } from 'pg';
import { getPoolPg } from './pg-pool';
import { logSqlError } from '../common';
import { IPoolPg } from '../@types/i-pg';

export const queryPg = async <R extends QueryResultRow = any> (
  connectionId: string,
  sqlText: string,
  sqlValues?: any[],
  throwError?: boolean,
  prefix?: string,
):
  Promise<QueryResult<R> | undefined> => {
  const pool: IPoolPg = await getPoolPg(connectionId);
  let res: QueryResult;
  try {
    if (Array.isArray(sqlValues)) {
      res = await pool.query(sqlText, sqlValues);
    } else {
      res = await pool.query(sqlText);
    }
    return res;
  } catch (err) {
    logSqlError(err, !throwError, sqlText, prefix);
  }
};
