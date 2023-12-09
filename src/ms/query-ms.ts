import { IResult } from 'mssql';
import * as sql from 'mssql';
import { logSqlError } from '../common';
import { closeDbConnectionsMs, getPoolMs } from './pool-ms';

export const queryMs = async <ColumnSetDescription = any>(
  connectionId: string,
  sqlText: string,
  throwError?: boolean,
  prefix?: string,
): Promise<IResult<ColumnSetDescription> | undefined> => {
  try {
    const pool = await getPoolMs(connectionId, throwError);
    if (!pool?.connected && !pool?.connecting) {
      await closeDbConnectionsMs(connectionId);
      return;
    }
    const request = new sql.Request(pool);
    // noinspection UnnecessaryLocalVariableJS
    const result = await request.query(sqlText);
    return result;
  } catch (err) {
    logSqlError(err, !throwError, sqlText, prefix);
  }
};
