import { magenta } from 'af-color';
import { closeAllPgConnectionsPg } from './pg/pg-pool';
import { closeAllDbConnectionsMs } from './mssql/pool-ms';
import { logger } from './logger-error';

export const logSqlError = (err: Error | any, throwError?: boolean, textSQL?: string, prefix?: string) => {
  if (prefix) {
    logger.error(prefix);
  }
  if (textSQL) {
    logger.error(`SQL Error:\n${magenta}${textSQL}`);
  }
  logger.error(err);
  if (throwError) {
    throw err;
  }
};

/**
 * Закрывает все соединения с БД и завершает работу скрипта
 */
export const graceExit = async () => {
  await closeAllPgConnectionsPg();
  await closeAllDbConnectionsMs();
  process.exit(0);
};
