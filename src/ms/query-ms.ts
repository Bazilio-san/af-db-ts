import { IResult } from 'mssql';
import * as sql from 'mssql';
import { bg, magenta, rs } from 'af-color';
import { logSqlError } from '../common';
import { closeDbConnectionsMs, getPoolMs } from './pool-ms';

export const queryMs = async <ColumnSetDescription = any> (
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
  } catch (err: Error | any) {
    const { lineNumber } = err || {};
    if (lineNumber) {
      const sqlTextLines = sqlText.replace(/\r\n/, '\n').split(/\n/);
      sqlTextLines[lineNumber - 1] = bg.yellow + sqlTextLines[lineNumber - 1] + rs + magenta;
      sqlText = sqlTextLines.join('\n');
    }
    logSqlError(err, !throwError, sqlText, prefix);
  }
};
