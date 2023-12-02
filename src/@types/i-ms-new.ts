import { ConnectionPool } from 'mssql';
import { IDateTimeOptionsEx, TFieldName } from './i-common';

/**
 * Метаинформация о поле БД
 */
export interface IFieldDefMs { // ранее IFieldSchemaMs
  /* Свойства 1-го элемента IColumnMetadata */
  name?: string,
  isNullable?: boolean, // nullable
  length?: number,
  octetLength?: number,
  dataType?: any, // type
  precision?: number,
  radix?: number,
  scale?: number,
  dtPrecision?: boolean,
  charSetName?: string,
  collation?: string,
  udtName?: any; // udt
  caseSensitive?: boolean, // VVQ

  identity?: boolean,
  readOnly?: boolean,
  arrayType?: any,
  index?: number,

  /* Дополнительные свойства */
  inputDateFormat?: string,
  dateTimeOptions?: IDateTimeOptionsEx,
  noQuotes?: boolean,
  escapeOnlySingleQuotes?: boolean,

  columnDefault?: any, // VVQ ITableSchemaMs.defaults defaultValue
  hasDefault?: boolean
}

export interface TColumnsSchemaMs { // ранее TRecordSchemaAssocMs
  [fieldName: TFieldName]: IFieldDefMs,
}

export interface TUniqueConstraintsMs {
  [constraintName: string]: string[]
}

export interface ITableSchemaMs {
  columnsSchema: TColumnsSchemaMs,
  pk: TFieldName[],
  uc: TUniqueConstraintsMs,
  serials: TFieldName[],
  defaults: { [fieldName: TFieldName]: string },
  fieldsList: TFieldName[],
  fieldsWoSerials: TFieldName[],
}

export interface IConnectionPoolsMs {
  [poolId: string]: ConnectionPool
}

export interface TGetPoolConnectionOptionsMs {
  // Префикс в сообщении о закрытии пула (название синхронизации)
  prefix?: string,
  // Что делать при ошибке соединения:
  // 'exit' - завершить скрипт,
  // 'throw' - бросить исключение.
  // Если не задано - только сообщать в консоль.
  onError?: 'exit' | 'throw'
  errorCode?: number
}
