import { ConnectionPool, IColumnMetadata, ISqlType } from 'mssql';
import { IDateTimeOptionsEx, IDialect, TFieldName, TRecordSet } from './i-common';
import { IDBConfigMs } from './i-config';

/**
 * Метаинформация о поле БД
 */
export interface IFieldSchemaMs {
  index?: number,
  name?: string,
  length?: number,
  type?: any,
  arrayType?: any,
  scale?: number,
  precision?: number,
  nullable?: boolean,
  caseSensitive?: boolean,
  identity?: boolean,
  excludeFromInsert?: boolean,
  readOnly?: boolean,
  inputDateFormat?: string,
  defaultValue?: any,
  noQuotes?: boolean,
  escapeOnlySingleQuotes?: boolean,
}

/**
 * Массив объектов с метаинформацией о полях
 */
export type TRecordSchemaMs = IFieldSchemaMs[] & { dateTimeOptions?: IDateTimeOptionsEx, dialect?: IDialect }

/**
 * Метаинформацией о полях, проиндексированная именами полей. (sql.recordset.columns)
 */
export interface TRecordSchemaAssocMs {
  [fieldName: TFieldName]: IFieldSchemaMs
}

/**
 * Объект корректировки типов полей. Наименованию поля соответствует новый тип.
 *
 * В частности, используется для полей, хранящих знаяения типа json в поле типа varchar(max)
 * тогда необходимо явно задать тип поля "json". Если имя поля заканчивается на _json, коррекция типа произойдет автоматически.
 * Также используется для указания входного формата для преобразования строки в тип datetime (свойство inputDateFormat в схеме поля)
 */
export interface TFieldTypeCorrectionMs {
  [fieldName: TFieldName]: IFieldSchemaMs
}

export interface TMergeResultMs {
  // кол-во затронутых записей
  total: number,
  // кол-во добавленных записей
  inserted: number,
  // кол-во измененных записей
  updated: number,
}

/**
 * Метаинформация для формирования инструкции SQL  MERGE
 */
export interface TMergeRulesMs {
  // массив имен полей, идентифицирующих запись, используемый в выражении ON в MERGE
  mergeIdentity?: TFieldName[],
  // массив имен полей, исключаемых из списка при вставке в MERGE. Обычно это автоинкрементное поле.
  excludeFromInsert?: TFieldName[],
  // если true - старые не нулевые значения полей не будут перезаписаны нулами при апдейте
  noUpdateIfNull?: boolean,
  correction?: Function,
  withClause?: string,
}

export interface TGetRecordSchemaOptionsMs {
  // массив имен полей, которые нужно удалить из схемы (не уитывается, если asArray = false)
  omitFields?: string[],
  // массив имен полей, которые нужно оставить в схеме
  pickFields?: string[],
  // кол-во измененных записей
  fieldTypeCorrection?: TFieldTypeCorrectionMs,
  mergeRules?: TMergeRulesMs,
  noReturnMergeResult?: boolean,
  dateTimeOptions?: IDateTimeOptionsEx,
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

export interface ISchemaItemMs {
  index: number;
  name: string;
  length: number;
  type: (() => ISqlType) | ISqlType;
  udt?: any;
  scale?: number | undefined;
  precision?: number | undefined;
  nullable: boolean;
  caseSensitive: boolean;
  identity: boolean;
  readOnly: boolean;
}

export interface IPrepareSqlStringArgsMs {
  // Значение, которое нужно подготовить для передачи в SQL
  value: string | number | null,
  // Значение, которое будет подставлено, если передано null | undefined и nullable = false
  defaultValue?: string | null | undefined,
  // Ограничение на длину поля. Если передано, строка урезается
  length?: number,
  // Подставлять NULL, если значение пусто или пустая строка.
  nullable?: boolean | number,
  noQuotes?: boolean,
  escapeOnlySingleQuotes?: boolean,
}

export interface IValueForSQLPartialArgsMs {
  dateTimeOptions?: IDateTimeOptionsEx,
  dialect?: IDialect
  escapeOnlySingleQuotes?: boolean,
  needValidate?: boolean, // Флаг необходимости валидации значения
}

export interface IPrepareRecordParamsMs {
  // Если TRUE - в записи добавляются пропущенные поля со значениями NULL, '', ...
  addMissingFields?: boolean,
  // Для полей, не допускающих NULL будет добавлено наиболее подходящее значение
  addValues4NotNullableFields?: boolean,
}

export interface IGetValueForSqlArgsMs extends IValueForSQLPartialArgsMs {
  value: any,
  fieldSchema: IFieldSchemaMs | string,
}

export interface IPrepareRecordForSqlArgsMs extends IValueForSQLPartialArgsMs, IPrepareRecordParamsMs {
  // объект описания структуры таблицы
  recordSchema: TRecordSchemaMs,
}

export interface IGetMergeSQLOptionsMs extends IValueForSQLPartialArgsMs, IPrepareRecordParamsMs {
  isPrepareForSQL?: boolean,
}

export type ISchemaArrayMs = ISchemaItemMs[] & { dateTimeOptions?: IDateTimeOptionsEx, dialect?: IDialect };

export interface TGetRecordSchemaResultMs {

  connectionId: string,
  dbConfig: IDBConfigMs,
  schemaAndTable: string,
  schemaTableMs: string,
  dbSchemaAndTable: string,
  columns: IColumnMetadata,
  schemaAssoc: Partial<IColumnMetadata>,
  schema: ISchemaArrayMs,
  fields: string[],
  insertFields: string[],
  insertFieldsList: string,
  withClause: string | undefined,
  updateFields: string[],
  mergeIdentity: string[],

  getMergeSQL: (_packet: TRecordSet, _prepareOptions?: IGetMergeSQLOptionsMs) => string,

  getInsertSQL: (_packet: TRecordSet, _addOutputInserted?: boolean) => string,

  getUpdateSQL: (_record: TRecordSet) => string,
}

export interface IConnectionPoolsMs {
  [poolId: string]: ConnectionPool
}
