import { DateTimeOptions } from 'luxon';

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
export type TRecordSet = TDBRecord[] & { _isPreparedForSQL?: boolean }

/**
 * Пакет записей БД.
 * Объект, проиндексированный алиасами. Каждый подобъект содержит TDBRecord.
 */
export interface TRecordSetAssoc {
  [recordKey: TRecordKey]: TDBRecord
}

export interface IDateTimeOptionsEx extends DateTimeOptions {
  correctionMillis?: number,
}
