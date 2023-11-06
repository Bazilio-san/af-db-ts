export interface IDBConfigCommon {
  dialect?: 'mssql' | 'pg',
  port: string | number | null | undefined,
  database: string,
  user: string,
  password: string,
}

export interface IDBConfigMs extends IDBConfigCommon {
  server: string,
}

export interface IDBConfigPg extends IDBConfigCommon {
  host: string,
  port: number,
}

export interface IDbOptionsMs {
  options: {
    enableArithAbort: boolean
  },
  pool: {
    max: number,
    min: number,
    idleTimeoutMillis: number
    acquireTimeoutMillis?: number,
    createTimeoutMillis?: number,
    destroyTimeoutMillis?: number,
    reapIntervalMillis?: number,
    createRetryIntervalMillis?: number,
  },
  trustServerCertificate: boolean,
  stream: boolean,
  parseJSON: boolean,
  requestTimeout: number
  connectionTimeout: number
}

export interface IDbOptionsPg {
  // all valid client config options are also valid here
  // in addition here are the pool specific configuration parameters:
  // number of milliseconds to wait before timing out when connecting a new client
  // by default this is 0 which means no timeout
  connectionTimeoutMillis: number,
  // number of milliseconds a client must sit idle in the pool and not be checked out
  // before it is disconnected from the backend and discarded
  // default is 10000 (10 seconds) - set to 0 to disable auto-disconnection of idle clients
  idleTimeoutMillis: number, // 3 h
  // maximum number of clients the pool should contain
  // by default this is set to 10.
  max: 10,
  statement_timeout: number, // number of milliseconds before a statement in query will time out, default is no timeout
  query_timeout: number, // number of milliseconds before a query call will timeout, default is no timeout
}

export interface IDbsMs {
  [dbId: string]: IDBConfigMs,
}

export interface IDbsPg {
  [dbId: string]: IDBConfigPg,
}

export interface IAFDatabasesConfig {
  db: {
    mssql: {
      options?: IDbOptionsMs,
      dbs: IDbsMs,
    },
    postgres: {
      options?: IDbOptionsPg,
      dbs: IDbsPg,
    },
  },
}
