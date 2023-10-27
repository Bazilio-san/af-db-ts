import { IResult } from 'mssql';
import * as sql from 'mssql';
import { logSqlError } from '../common';
import { closeDbConnectionsMs, getPoolMs } from './pool-ms';

export const queryMs = async (
  connectionId: string,
  sqlText: string,
  throwError?: boolean,
  prefix?: string,
): Promise<IResult<any> | undefined> => {
  const pool = await getPoolMs(connectionId, throwError);
  if (!pool?.connected && !pool?.connecting) {
    await closeDbConnectionsMs(connectionId);
    return;
  }
  const request = new sql.Request(pool);
  let res: IResult<any>;
  try {
    res = await request.query(sqlText);
    return res;
  } catch (err) {
    logSqlError(err, !throwError, sqlText, prefix);
  }
};
