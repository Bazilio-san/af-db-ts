import config from 'config';
import { echo } from 'af-echo-ts';
import * as sql from 'mssql';
import { ConnectionPool } from 'mssql';
import { sleep } from 'af-tools-ts';
import { IDbOptionsMs, IDbsMs } from '../@types/i-config';
import { logSqlError } from '../common';
import { IConnectionPoolsMs, TGetPoolConnectionOptionsMs } from '../@types/i-ms';

const mssqlConfigs = config.get<{ options: IDbOptionsMs, dbs: IDbsMs }>('db.postgres');

export const getDbConfigMs = (connectionId: string) => mssqlConfigs.dbs[connectionId];

export const poolsCacheMs: IConnectionPoolsMs = {};

/**
 * Возвращает пул соединений для БД, соответствующей преданному ID соединения (borf|cep|hr|global)
 * В случае, если не удается создать пул или открыть соединение, прерывает работу скрипта
 */
export const getPoolConnectionMs = async (connectionId: string, options: TGetPoolConnectionOptionsMs = {}): Promise<ConnectionPool | undefined> => {
  const { prefix = '', errorCode = 0 } = options;
  let pool = poolsCacheMs[connectionId];
  if (pool?.connected) {
    return pool;
  }
  const resume = (errMsg: string) => {
    if (options.onError === 'exit') {
      echo.error(prefix, `${errMsg}\nEXIT PROCESS`);
      process.exit(errorCode);
    } else {
      throw new Error(errMsg);
    }
  };
  try {
    const { database, db } = config as any;
    let dbOptions: any;
    let namedDbConfig: any;
    if (database) {
      namedDbConfig = database[connectionId];
      if (!namedDbConfig) {
        resume(`Missing configuration for DB id "${connectionId}"`);
      }
      dbOptions = database._common_ || {};
    } else if (db) {
      namedDbConfig = db?.mssql?.dbs?.[connectionId];
      dbOptions = db?.mssql?.options || {};
    }
    if (!namedDbConfig) {
      resume(`Missing configuration for DB id "${connectionId}"`);
    }
    const dbConfig = config.util.extendDeep({}, dbOptions, namedDbConfig);

    if (pool?.connecting) {
      const startTs = Date.now();
      while (pool?.connecting && (Date.now() - startTs < dbConfig.connectionTimeout)) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(100);
      }
      if (pool?.connected) {
        return pool;
      }
      echo.error(prefix, `Can't connect connectionId "${connectionId}"`);
    }
    pool = new sql.ConnectionPool(dbConfig);
    if (typeof pool !== 'object') {
      resume(`Can't create connection pool "${connectionId}"`);
    }
    poolsCacheMs[connectionId] = pool;
    // @ts-ignore
    pool._connectionId = connectionId;
    pool.on('close', () => {
      delete poolsCacheMs[connectionId];
    });
    pool.on('error', (err) => {
      echo.error('POOL-ERROR', err);
    });
    await pool.connect();
    return pool;
  } catch (err) {
    echo.error(err);
    resume(`Cant connect to "${connectionId}" db`);
  }
};

/**
 * Закрывает указанные соединения с БД
 *
 * poolsToClose - пул или массив пулов
 * prefix - Префикс в сообщении о закрытии пула (название синхронизации)
 * noEcho - подавление сообщений о закрытии соединения
 */
export const closeDbConnectionsMs = async (poolsToClose: ConnectionPool | ConnectionPool[] | string | string[], prefix?: string, noEcho?: boolean) => {
  if (!Array.isArray(poolsToClose)) {
    // @ts-ignore
    poolsToClose = [poolsToClose];
  }
  // @ts-ignore
  for (let i = 0; i < poolsToClose.length; i++) {
    let pool = poolsToClose[i];
    let connectionId: string = '';
    if (pool) {
      if (typeof pool === 'string') {
        connectionId = pool;
        pool = poolsCacheMs[connectionId];
      } else if (typeof pool === 'object') {
        // @ts-ignore
        connectionId = pool._connectionId;
      }
      if (connectionId) {
        delete poolsCacheMs[connectionId];
      }
      if (pool && pool.close) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await pool.close();
          if (!noEcho && connectionId) {
            const msg = `pool "${connectionId}" closed`;
            if (prefix) {
              echo.info(prefix, msg);
            } else {
              echo.info(msg);
            }
          }
        } catch (err) {
          //
        }
      }
    }
  }
};

/**
 * @deprecated since version 2.0.0
 */
export const closeAllDbConnections = async (prefix?: string, noEcho?: boolean) => {
  const poolsToClose = Object.values(poolsCacheMs);
  await closeDbConnectionsMs(poolsToClose, prefix, noEcho);
};

/**
 * Закрывает все соединения с БД
 *
 * prefix - Префикс в сообщении о закрытии пула (название синхронизации)
 * noEcho - подавление сообщений о закрытии соединения
 */
export const closeAllDbConnectionsMs = async (prefix?: string, noEcho?: boolean) => {
  const poolsToClose = Object.values(poolsCacheMs);
  await closeDbConnectionsMs(poolsToClose, prefix, noEcho);
};

/**
 * @deprecated since version 2.0.0
 */
export const closeDbConnectionsAndExit = async (poolsToClose: ConnectionPool | ConnectionPool[], prefix?: string) => {
  await closeDbConnectionsMs(poolsToClose, prefix);
  process.exit(0);
};

/**
 * Закрывает указанные соединения с БД и прерывает работу скрипта
 *
 * poolsToClose - пул или массив пулов
 * prefix - Префикс в сообщении о закрытии пула (название синхронизации)
 */
export const closeDbConnectionsAndExitMs = async (poolsToClose: ConnectionPool | ConnectionPool[], prefix?: string) => {
  await closeDbConnectionsMs(poolsToClose, prefix);
  process.exit(0);
};

export const getPoolMs = async (connectionId: string, throwError?: boolean) => {
  try {
    return getPoolConnectionMs(connectionId);
  } catch (err) {
    logSqlError(err, throwError, `Error while open connection to DB ${connectionId}`);
  }
};
