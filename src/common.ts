import { magenta } from 'af-color';
import { closeAllPgConnectionsPg } from './pg/pool-pg';
import { closeAllDbConnectionsMs } from './ms/pool-ms';
import { logger } from './logger-error';

export const NULL = 'null';

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

export const closeAllDb = async () => {
  await closeAllPgConnectionsPg();
  await closeAllDbConnectionsMs();
};

/**
 * Закрывает все соединения с БД и завершает работу скрипта
 */
export const graceExit = async () => {
  await closeAllPgConnectionsPg();
  await closeAllDbConnectionsMs();
  process.exit(0);
};

export const _3_HOURS = 3_600_000 * 3; // 3 ч
export const _1_HOUR = 3_600_000; // 1 ч
