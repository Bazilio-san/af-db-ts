import config from 'config';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { echo } from 'af-echo-ts';
import { logger } from '../logger-error';
import { IDbOptionsPg, IDbsPg } from '../@types/i-config';
import { IConnectionPoolsPg, IPoolClientPg, IPoolPg } from '../@types/i-pg';

const pgConfigs = config.get<{ options: IDbOptionsPg, dbs: IDbsPg }>('db.postgres');

export const poolsCachePg: IConnectionPoolsPg = {};

export const getPoolPg = async (connectionId: string): Promise<IPoolPg> => {
  if (!poolsCachePg[connectionId]) {
    const poolConfig: PoolConfig = { ...pgConfigs.options, ...pgConfigs.dbs[connectionId] };
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
