import * as config from 'config';
import { magenta } from 'af-color';
import { echo } from 'af-echo-ts';
import * as sql from 'mssql';
import { ConnectionPool, IResult } from 'mssql';
import * as _ from 'lodash';
import { sleep } from 'af-tools-ts';
import { IConnectionPools, TGetPoolConnectionOptions } from './interfaces';

export const getFirstConfigId = () => Object.keys(config.get<any>('database') || {}).filter((v) => !['dialect', '_common_'].includes(v))[0];
export const getDbConfig = (connectionId: string) => config.get<any>(`database.${connectionId}`);

export const pools: IConnectionPools = {};

/**
 * Возвращает пул соединений для БД, соответствующей преданному ID соединения (borf|cep|hr|global)
 * В случае, если не удается создать пул или открыть соединение, прерывает работу скрипта
 */
export const getPoolConnection = async (connectionId: string, options: TGetPoolConnectionOptions = {}): Promise<ConnectionPool | undefined> => {
  const { prefix = '', errorCode = 0 } = options;
  let pool = pools[connectionId];
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
    const cfg: any = config.get<any>('database');
    const namedDbConfig = cfg[connectionId];
    if (!namedDbConfig) {
      resume(`Missing configuration for DB id "${connectionId}"`);
    }
    const dbConfig = config.util.extendDeep({}, cfg._common_ || {}, cfg[connectionId]);
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
    pools[connectionId] = pool;
    // @ts-ignore
    pool._connectionId = connectionId;
    pool.on('close', () => {
      delete pools[connectionId];
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
export const closeDbConnections = async (poolsToClose: ConnectionPool | ConnectionPool[] | string | string[], prefix?: string, noEcho?: boolean) => {
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
        pool = pools[connectionId];
      } else if (typeof pool === 'object') {
        // @ts-ignore
        connectionId = pool._connectionId;
      }
      if (connectionId) {
        delete pools[connectionId];
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
 * Закрывает все соединения с БД
 *
 * prefix - Префикс в сообщении о закрытии пула (название синхронизации)
 * noEcho - подавление сообщений о закрытии соединения
 */
export const closeAllDbConnections = async (prefix?: string, noEcho?: boolean) => {
  const poolsToClose = _.map(pools, (p) => p);
  await closeDbConnections(poolsToClose, prefix, noEcho);
};

/**
 * Закрывает указанные соединения с БД и прерывает работу скрипта
 *
 * poolsToClose - пул или массив пулов
 * prefix - Префикс в сообщении о закрытии пула (название синхронизации)
 */
export const closeDbConnectionsAndExit = async (poolsToClose: ConnectionPool | ConnectionPool[], prefix?: string) => {
  await closeDbConnections(poolsToClose, prefix);
  process.exit(0);
};

export const Request = async (connectionId: string, strSQL: string): Promise<any> => {
  const pool = await getPoolConnection(connectionId, { onError: 'throw' });
  const request = new sql.Request(pool);
  if (strSQL) {
    return request.query(strSQL);
  }
  return request;
};

interface IAsLogger {
  error: Function,
}

let logger: IAsLogger = echo as IAsLogger;

export const setLogger = (logger_: any) => {
  logger = logger_ as IAsLogger;
};

export const logSqlError = (err: Error | any, noThrow?: boolean, textSQL?: string, prefix?: string) => {
  if (prefix) {
    logger.error(prefix);
  }
  if (textSQL) {
    logger.error(`SQL Error:\n${magenta}${textSQL}`);
  }
  logger.error(err);
  if (!noThrow) {
    throw err;
  }
};

export const getPool = async (dbId: string, noThrow: boolean = false) => {
  try {
    return getPoolConnection(dbId);
  } catch (err) {
    logSqlError(err, noThrow, `Error while open connection to DB ${dbId}`);
  }
};

export const query = async (dbId: string, textSQL: string, noThrow?: boolean, prefix?: string): Promise<IResult<any> | undefined> => {
  const pool = await getPool(dbId, noThrow);
  if (!pool?.connected && !pool?.connecting) {
    await closeDbConnections(dbId);
    return;
  }
  const request = new sql.Request(pool);
  let res: IResult<any>;
  try {
    res = await request.query(textSQL);
    return res;
  } catch (err) {
    logSqlError(err, noThrow, textSQL, prefix);
  }
};
