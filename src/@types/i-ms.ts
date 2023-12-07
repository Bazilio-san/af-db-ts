import { ConnectionPool } from 'mssql';
import { IFieldDef, TFieldName } from './i-common';
import { TDataTypeMs } from './i-data-types-ms';

/**
 * Метаинформация о поле БД
 */
export interface IFieldDefMs extends IFieldDef {
  dataType?: TDataTypeMs,

  octetLength?: number,
  charSetName?: string,
  collation?: string,
  caseSensitive?: boolean, // VVQ

  identity?: boolean,
  arrayType?: TDataTypeMs,

  /* Дополнительные свойства */
  escapeOnlySingleQuotes?: boolean,
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
  defaults: { [fieldName: TFieldName]: string },
  fieldsArray: TFieldName[], // массив имен всех полей
  serialsFields: TFieldName[], // массив имен полей типа identity
  readOnlyFields: TFieldName[], // массив имен полей ReadOnly
  fieldsWoSerialsAndRO: TFieldName[], // массив имен полей без полей identity и ReadOnly
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
