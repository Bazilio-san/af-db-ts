import { Pool, PoolClient } from 'pg';

export enum EDataTypePg {
  'USER_DEFINED' = 'USER-DEFINED',
  'bigint' = 'bigint',
  'boolean' = 'boolean',
  'character' = 'character',
  'varchar' = 'character varying',
  'date' = 'date',
  'integer' = 'integer',
  'json' = 'json',
  'jsonb' = 'jsonb',
  'numeric' = 'numeric',
  'real' = 'real',
  'smallint' = 'smallint',
  'text' = 'text',
  'timestamptz' = 'timestamp with time zone',
  'timestamp' = 'timestamp without time zone',
  'uuid' = 'uuid',
  'ARRAY' = 'ARRAY',
}

export interface IFieldDefPg {
  name: string,
  isNullable: boolean,
  columnDefault: string | number | boolean,
  hasDefault: boolean,
  dataType: EDataTypePg,
  maxLen?: number,
  precision?: number,
  radix?: number,
  dtPrecision?: number,
  udtName?: string,
}

export interface TColumnsSchemaPg {
  [fieldName: string]: IFieldDefPg,
}

export interface TUniqueConstraintsPg {
  [constraintName: string]: string[]
}

export interface ITableSchemaPg {
  columnsSchema: TColumnsSchemaPg,
  pk: string[],
  uc: TUniqueConstraintsPg,
  serials: string[],
  defaults: { [fieldName: string]: string },
  fieldsList: string[],
  fieldsWoSerials: string[],
}

export interface IPoolClientPg extends PoolClient {
  _connected: boolean,
  processID: number,
  database: string,
  end: Function,
}

export interface IPoolPg extends Pool {
  _clients: IPoolClientPg[]
}

export interface IConnectionPoolsPg {
  [connectionId: string]: IPoolPg
}
