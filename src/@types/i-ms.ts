import * as sql from 'mssql';
import { ConnectionPool } from 'mssql';
import { IFieldDef, TFieldName } from './i-common';

export type TDataTypeMs =
  typeof sql.VarChar |
  typeof sql.NVarChar |
  typeof sql.Text |
  typeof sql.Int |
  typeof sql.BigInt |
  typeof sql.TinyInt |
  typeof sql.SmallInt |
  typeof sql.Bit |
  typeof sql.Float |
  typeof sql.Numeric |
  typeof sql.Decimal |
  typeof sql.Real |
  typeof sql.Date |
  typeof sql.DateTime |
  typeof sql.DateTime2 |
  typeof sql.DateTimeOffset |
  typeof sql.SmallDateTime |
  typeof sql.Time |
  typeof sql.UniqueIdentifier |
  typeof sql.SmallMoney |
  typeof sql.Money |
  typeof sql.Binary |
  typeof sql.VarBinary |
  typeof sql.Image |
  typeof sql.Xml |
  typeof sql.Char |
  typeof sql.NChar |
  typeof sql.NText |
  typeof sql.TVP |
  typeof sql.UDT |
  typeof sql.Geography |
  typeof sql.Geometry |
  typeof sql.Variant |
  'bool' |
  'boolean' |
  'bit' |
  'tinyint' |
  'smallint' |
  'int' |
  'integer' |
  'bigint' |

  'number' |
  'decimal' |
  'float' |
  'money' |
  'numeric' |
  'smallmoney' |
  'real' |

  'json' |

  'string' |
  'char' |
  'nchar' |
  'text' |
  'ntext' |
  'varchar' |
  'nvarchar' |
  'xml' |

  'uid' |
  'uuid' |
  'uniqueIdentifier' |
  'datetime' |
  'datetime2' |
  'date' |
  'time' |
  'smalldatetime' |
  'datetimeoffset' |
  'binary' |
  'varbinary' |
  'image' |
  'udt' |
  'geography' |
  'geometry' |
  'variant' |
  'array'

/**
 * Метаинформация о поле БД
 */
export interface IFieldDefMs extends IFieldDef {
  octetLength?: number,
  scale?: number,
  charSetName?: string,
  collation?: string,
  caseSensitive?: boolean, // VVQ

  identity?: boolean,
  arrayType?: any,

  /* Дополнительные свойства */
  escapeOnlySingleQuotes?: boolean,
  dataType?: TDataTypeMs,
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
