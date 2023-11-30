import { ConnectionPool } from 'mssql';
import { IDateTimeOptionsEx } from './i-common';

/**
 * Метаинформация о поле БД
 */
export interface IFieldDefMs { // ранее IFieldSchemaMs
  /* Свойства 1-го элемента IColumnMetadata */
  name: string,
  isNullable: boolean, // nullable
  length?: number,
  dataType?: any, // type
  scale?: number,
  precision?: number,
  caseSensitive?: boolean,
  identity?: boolean,
  readOnly?: boolean,
  arrayType?: any,
  udt?: any;
  index?: number,

  /* Дополнительные свойства */
  inputDateFormat?: string,
  dateTimeOptions?: IDateTimeOptionsEx,
  noQuotes?: boolean,
  escapeOnlySingleQuotes?: boolean,

  columnDefault: any, // VVQ ITableSchemaMs.defaults defaultValue
  hasDefault: boolean
}

export interface TColumnsSchemaMs { // ранее TRecordSchemaAssocMs
  [fieldName: string]: IFieldDefMs,
}

export interface TUniqueConstraintsMs {
  [constraintName: string]: string[]
}

export interface ITableSchemaMs {
  columnsSchema: TColumnsSchemaMs,
  pk: string[],
  uc: TUniqueConstraintsMs,
  serials: string[],
  defaults: { [fieldName: string]: string },
  fieldsList: string[],
  fieldsWoSerials: string[],
}

export interface IConnectionPoolsMs {
  [poolId: string]: ConnectionPool
}
