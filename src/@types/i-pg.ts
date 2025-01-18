import { Pool, PoolClient } from 'pg';
import { IFieldDef, TFieldName } from './i-common';
import { TDataTypePg } from './i-data-types-pg';

export interface IFieldDefPg extends IFieldDef {
  dataType?: TDataTypePg,
  arrayType?: TDataTypePg,
  comment?: string | null,
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
  defaults: { [fieldName: string]: string },
  fieldsArray: TFieldName[], // массив имен всех полей
  serialsFields: TFieldName[], // массив имен полей типа identity
  readOnlyFields: TFieldName[], // массив имен полей ReadOnly
  fieldsWoRO: TFieldName[], // массив имен полей без полей ReadOnly
  fieldsWoSerialsAndRO: TFieldName[], // массив имен полей без полей identity и ReadOnly
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
