
import fs from 'fs';
import config from 'config';
import { Util } from 'config/lib/util.js';
import { Server } from 'net';
import { Client as SshClient } from 'ssh2';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { createTunnel } from 'tunnel-ssh';
import { cloneDeep } from 'af-tools-ts';
import { logger } from '../logger-error';
import { IDBConfigPg, IDbOptionsPg, IDbsPg, IRegisterTypeFn, ISshTunnelConfig } from '../@types/i-config';
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

dbOptions = Util.extendDeep(defaultOptions, dbOptions);

export const getDbConfigPg = <T = IDBConfigPg> (connectionId: string, includeOptions?: boolean, throwError?: boolean): T | undefined => {
  const namedDbConfig = dbs[connectionId];
  if (!namedDbConfig) {
    if (throwError) {
      throw new Error(`Missing configuration for DB id "${connectionId}"`);
    }
    return undefined;
  }
  return (includeOptions ? Util.extendDeep(dbOptions, namedDbConfig) : namedDbConfig) as T;
};

export const poolsCachePg: IConnectionPoolsPg = {};

export interface ISshTunnelEntry {
  server: Server,
  client: SshClient,
}

export const sshTunnelsCachePg: { [connectionId: string]: ISshTunnelEntry } = {};

const createSshTunnel = async (connectionId: string, sshConfig: ISshTunnelConfig, pgHost: string, pgPort: number): Promise<{ host: string, port: number }> => {
  const sshOptions: Record<string, any> = {
    host: sshConfig.host,
    port: sshConfig.port || 22,
    username: sshConfig.username,
  };
  if (sshConfig.privateKey) {
    sshOptions.privateKey = fs.readFileSync(sshConfig.privateKey);
  } else if (sshConfig.password) {
    sshOptions.password = sshConfig.password;
  }

  const dstHost = sshConfig.dstHost || pgHost;
  const dstPort = sshConfig.dstPort || pgPort;

  const [server, client] = await createTunnel(
    { autoClose: false, reconnectOnError: false },
    { port: 0 },
    sshOptions,
    { srcAddr: '127.0.0.1', srcPort: 0, dstAddr: dstHost, dstPort },
  );

  sshTunnelsCachePg[connectionId] = { server, client };

  const addr = server.address();
  const localPort = typeof addr === 'object' && addr ? addr.port : 0;

  debugX(`SSH tunnel [${connectionId}] created: 127.0.0.1:${localPort} -> ${dstHost}:${dstPort} via ${sshConfig.host}:${sshConfig.port || 22}`);

  return { host: '127.0.0.1', port: localPort };
};

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

    // Извлечь и удалить ssh-конфиг из poolConfig (pg.Pool его не знает)
    const sshConfig = (poolConfig as any)?.ssh as ISshTunnelConfig | undefined;
    if (sshConfig) {
      delete (poolConfig as any).ssh;
      const tunnelAddr = await createSshTunnel(connectionId, sshConfig, poolConfig.host || '127.0.0.1', poolConfig.port || 5432);
      poolConfig.host = tunnelAddr.host;
      poolConfig.port = tunnelAddr.port;
    }

    // Используем опцию verify для регистрации типов на каждом новом клиенте.
    // pg-pool вызывает verify ПЕРЕД тем как отдать клиент потребителю,
    // что исключает гонку между registerTypesFunctions и пользовательскими запросами.
    // Ранее registerTypesFunctions вызывались в async-обработчике события 'connect',
    // но pg-pool эмитит 'connect' синхронно и сразу отдаёт клиент — это приводило к
    // DeprecationWarning в pg >= 8.19 ("client.query() when already executing a query").
    const poolOptions: PoolConfig & IDbOptionsPg & { verify?: (client: PoolClient, done: (err?: Error) => void) => void } = { ...poolConfig };
    if (Array.isArray(registerTypesFunctions) && registerTypesFunctions.length > 0) {
      const fns = registerTypesFunctions;
      poolOptions.verify = (client: PoolClient, done: (err?: Error) => void) => {
        Promise.all(fns.map((fn) => fn(client)))
          .then(() => done())
          .catch((err) => done(err));
      };
    }

    const pool = new Pool(poolOptions) as IPoolPg;
    poolsCachePg[connectionId] = pool;
    // Событие 'error' пула эмитится из makeIdleListener в pg-pool,
    // который уже удалил клиент из пула (pool._remove) и вызвал client.end().
    // Повторный вызов client.release() здесь приводил к throwOnDoubleRelease().
    pool.on('error', (err: Error, _client: PoolClient) => {
      logger.error(err);
    });
    pool.on('connect', (client: PoolClient) => {
      const { database, processID } = client as unknown as IPoolClientPg;
      debugX(`PG client [${connectionId}] connected! DB: "${database}" / processID: ${processID}`);
    });
    pool.on('remove', (client: PoolClient) => {
      const { database, processID } = client as unknown as IPoolClientPg;
      debugX(`PG client [${connectionId}] removed. DB: "${database}" / processID: ${processID}`);
    });
    // Eager-connect: создаём первое соединение сразу для раннего обнаружения ошибок.
    // Ранее pool.connect() вызывался без сохранения клиента, что приводило к утечке.
    const initialClient = await pool.connect();
    initialClient.release();
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

  // Закрыть SSH-туннель, если он был создан для этого connectionId
  const tunnel = sshTunnelsCachePg[connectionId];
  if (tunnel) {
    try {
      tunnel.client.end();
    } catch (_e) {
      // ignore
    }
    try {
      tunnel.server.close();
    } catch (_e) {
      // ignore
    }
    delete sshTunnelsCachePg[connectionId];
    debugX(`SSH tunnel [${connectionId}] closed`);
  }

  return true;
};

export const closeAllPgConnectionsPg = async () => Promise.all(Object.keys(poolsCachePg).map((connectionId) => closePoolPg(connectionId)));
