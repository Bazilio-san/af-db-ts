/* eslint-disable no-await-in-loop */
import config from 'config';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { cloneDeep } from 'af-tools-ts';
import { logger } from '../logger-error';
import { IDbOptionsPg, IDbsPg, IRegisterTypeFn } from '../@types/i-config';
import { IConnectionPoolsPg, IPoolClientPg, IPoolPg } from '../@types/i-pg';
import { _3_HOURS } from '../common';
import { debugX } from '../debug';

const cfg = cloneDeep(config.util.toObject(config)) as any;

let dbs: IDbsPg = {};
let dbOptions: any = {};
if (cfg.database) {
  dbs = { ...cfg.database } as IDbsPg;
  dbOptions = {};
} else if (cfg.db?.postgres?.dbs) {
  dbs = { ...cfg.db.postgres.dbs };
  dbOptions = { ...(cfg.db.postgres.options || {}) };
}

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
  query_timeout: _3_HOURS, // number of milliseconds until the request call times out, no timeout by default
};

dbOptions = config.util.extendDeep(defaultOptions, dbOptions);

export const getDbConfigPg = <T> (connectionId: string, includeOptions?: boolean, throwError?: boolean): T | undefined => {
  const namedDbConfig = dbs[connectionId];
  if (!namedDbConfig) {
    if (throwError) {
      throw new Error(`Missing configuration for DB id "${connectionId}"`);
    }
    return undefined;
  }
  return includeOptions ? config.util.extendDeep(dbOptions, namedDbConfig) : namedDbConfig;
};

export const poolsCachePg: IConnectionPoolsPg = {};

export const getPoolPg = async (arg: {
  connectionId: string,
  poolConfig?: PoolConfig & IDbOptionsPg,
  throwError?: boolean,
  registerTypesFunctions?: IRegisterTypeFn[]
} | string, throwError?: boolean, registerTypesFunctions?: IRegisterTypeFn[]): Promise<IPoolPg> => {
  let poolConfig: (PoolConfig & IDbOptionsPg) | undefined;
  let connectionId: string = '';
  if (typeof arg === 'string') {
    connectionId = arg;
  } else {
    ({ connectionId, poolConfig, throwError, registerTypesFunctions } = arg);
  }

  if (!poolsCachePg[connectionId]) {
    if (!poolConfig) {
      poolConfig = getDbConfigPg<PoolConfig & IDbOptionsPg>(connectionId, true, throwError) as PoolConfig & IDbOptionsPg;
    }
    const pool = new Pool(poolConfig) as IPoolPg;
    poolsCachePg[connectionId] = pool;
    pool.on('error', (err: Error, client: PoolClient) => {
      client.release(true);
      logger.error(err);
    });
    pool.on('connect', async (client: PoolClient) => {
      const { database, processID } = client as unknown as IPoolClientPg;
      debugX(`PG client [${connectionId}] connected! DB: "${database}" / processID: ${processID}`);
      if (Array.isArray(registerTypesFunctions)) {
        await Promise.all(registerTypesFunctions.map((fn) => fn(client)));
      }
    });
    pool.on('remove', (client: PoolClient) => {
      const { database, processID } = client as unknown as IPoolClientPg;
      debugX(`PG client [${connectionId}] removed. DB: "${database}" / processID: ${processID}`);
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
