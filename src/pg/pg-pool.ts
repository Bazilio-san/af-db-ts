import config from 'config';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { echo } from 'af-echo-ts';
import { logger } from '../logger-error';
import { IDbOptionsPg, IDbsPg } from '../@types/i-config';
import { IConnectionPoolsPg, IPoolClientPg, IPoolPg } from '../@types/i-pg';
import { _3_HOURS } from '../common';

const pgConfigs = config.get<{ options: IDbOptionsPg, dbs: IDbsPg }>('db.postgres');

const defaultOptions: IDbOptionsPg = {
  // all valid client config options are also valid here
  // in addition here are the pool specific configuration parameters:
  // number of milliseconds to wait before timing out when connecting a new client
  // by default this is 0 which means no timeout
  connectionTimeoutMillis: 5 * 60_000, // 5 min
  // number of milliseconds a client must sit idle in the pool and not be checked out
  // before it is disconnected from the backend and discarded
  // default is 10000 (10 seconds) - set to 0 to disable auto-disconnection of idle clients
  idleTimeoutMillis: _3_HOURS, // 3 h
  // maximum number of clients the pool should contain
  // by default this is set to 10.
  max: 10,
  statement_timeout: _3_HOURS, // number of milliseconds before a statement in query will time out, default is no timeout
  query_timeout: _3_HOURS, // number of milliseconds before a query call will timeout, default is no timeout
};

export const poolsCachePg: IConnectionPoolsPg = {};

export const getPoolPg = async (connectionId: string): Promise<IPoolPg> => {
  if (!poolsCachePg[connectionId]) {
    const namedDbConfig = pgConfigs.dbs[connectionId];
    const poolConfig: PoolConfig = config.util.extendDeep(defaultOptions, pgConfigs.options, namedDbConfig);
    const pool = new Pool(poolConfig) as IPoolPg;
    poolsCachePg[connectionId] = pool;
    pool.on('error', (err: Error, client: PoolClient) => {
      client.release(true);
      logger.error(err);
    });
    pool.on('connect', (client: PoolClient) => {
      const { database, processID } = client as unknown as IPoolClientPg;
      echo.debug(`PG client [${connectionId}] connected! DB: "${database}" / processID: ${processID}`);
    });
    pool.on('remove', (client: PoolClient) => {
      const { database, processID } = client as unknown as IPoolClientPg;
      echo.debug(`PG client [${connectionId}] removed. DB: "${database}" / processID: ${processID}`);
    });
    await pool.connect();
  }
  return poolsCachePg[connectionId];
};

export const closePoolPg = async (connectionId: string): Promise<boolean> => {
  if (!connectionId) {
    return false;
  }
  const pool = poolsCachePg[connectionId];
  if (!pool) {
    return true;
  }
  const fns = (pool._clients || [])
    .filter((client: IPoolClientPg) => client?._connected && typeof client?.end === 'function')
    .map((client: IPoolClientPg) => client.end());
  await Promise.all(fns);
  return true;
};

export const closeAllPgConnectionsPg = async () => Promise.all(Object.keys(poolsCachePg).map((connectionId) => closePoolPg(connectionId)));
