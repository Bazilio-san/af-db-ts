export type IDialect = 'mssql' | 'pg';

/**
 * Имя поля БД
 */
export type TFieldName = string;

/**
 * Значение ключевого поля записи БД
 */
export type TRecordKey = string | number;

/**
 * Запись БД. Объект, проиндексированный именами полей. Значения - значения полей
 */
export interface TDBRecord {
  [fieldName: TFieldName]: any
}

/**
 * Массив записей БД
 *
 * _isPreparedForSQL - Признак того, что значения полей подготовлены для использования в строке SQL
 */
export type TRecordSet<U extends TDBRecord = TDBRecord> = U[] & { _isPreparedForSQL?: boolean }

/**
 * Пакет записей БД.
 * Объект, проиндексированный алиасами. Каждый подобъект содержит TDBRecord.
 */
export interface TRecordSetAssoc {
  [recordKey: TRecordKey]: TDBRecord
}

export interface IDateTimeOptionsEx {
  correctionMillis?: number,
  /**
   * Использует эту зону, если в самой входной строке не указано смещение.
   * Также преобразует время в эту зону.
   * @default local
   */
  fromZone?: string;
  /**
   * Результирующая строка должна быть с указанием в этой таймзоне
   * @default undefined
   */
  setZone?: string;
  /**
   * Результирующая строка будет содержать смещение, например «Z» или «-04:00».
   * @default true
   */
  includeOffset?: boolean;
}

export interface IFieldDef {
  name?: string,
  isNullable?: boolean,
  length?: number,
  dataType?: any, // type
  arrayType?: any,

  precision?: number,
  radix?: number,

  dtPrecision?: number,

  columnDefault?: string | number | boolean,
  hasDefault?: boolean,

  readOnly?: boolean,

  /* Дополнительные свойства */
  inputDateFormat?: string,
  dateTimeOptions?: IDateTimeOptionsEx,
  noQuotes?: boolean,
}
