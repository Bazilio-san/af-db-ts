export {
  TDBRecord,
  TRecordSetAssoc,
  IDialect,
  TFieldName,
  TRecordKey,
  TRecordSet,
  IDateTimeOptionsEx,
} from './@types/i-common';

export {
  IAFDatabasesConfig,
  IDBConfigCommon,
  IDBConfigMs,
  IDBConfigPg,
  IDbsMs,
  IDbsPg,
  IRegisterTypeFn,
  IDbOptionsPg,
  IDbOptionsMs,
} from './@types/i-config';

export {
  closeAllDb,
  graceExit,
  logSqlError,
} from './common';

export { setLogger } from './logger-error';

export {
  schemaTable,
  prepareJSON,
  prepareUUID,
  binToHexString,
  removePairBrackets,
  q,
} from './utils/utils';

export {
  getLuxonDT,
  getTypeOfDateInput,
  dateTimeValue,
  getDatetimeWithPrecisionAndOffset,
} from './utils/utils-dt';

export {
  parseIntNumber,
  prepareIntNumber,

  parseFloatNumber,
  prepareFloatNumber,

  prepareBigIntNumber,
} from './utils/utils-num';

// ######################### MS #####################################

export { TDataTypeMs } from './@types/i-data-types-ms';

export {
  IFieldDefMs,
  TColumnsSchemaMs,
  ITableSchemaMs,
  TUniqueConstraintsMs,
  IConnectionPoolsMs,
  TGetPoolConnectionOptionsMs,
} from './@types/i-ms';

export {
  genTableInterfaceMs,
  genTableInterfacesMs,
} from './ms/gen-table-interfaces-ms';

export { getJsTypeByTypeMs } from './ms/utils-ms';

export { getInsertSqlMs } from './ms/get-sql/insert';

export { getMergeSqlMs } from './ms/get-sql/merge';

export { getUpdateSqlMs } from './ms/get-sql/update';

export {
  poolsCacheMs,
  getPoolConnectionMs,
  closeAllDbConnectionsMs,
  closeDbConnectionsAndExitMs,
  closeDbConnectionsMs,
  getDbConfigMs,
  getPoolMs,
} from './ms/pool-ms';

export {
  prepareSqlValueMs,
  prepareSqlStringMs,
  escapeStringMs,
} from './ms/prepare-value';

export { queryMs } from './ms/query-ms';

export {
  getTableSchemaMs,
  correctRecordSchemaMs,
} from './ms/table-schema-ms';

export { wrapTransactionMs } from './ms/wrap-transaction-ms';

// ######################### PG #####################################

export {
  IFieldDefPg,
  TColumnsSchemaPg,
  ITableSchemaPg,
  TUniqueConstraintsPg,
  IPoolPg,
  IConnectionPoolsPg,
  IPoolClientPg,
} from './@types/i-pg';

export { TDataTypePg } from './@types/i-data-types-pg';

export {
  genTableInterfacePg,
  genTableInterfacesPg,
} from './pg/gen-table-interfaces-pg';

export {
  getJsTypeByTypePg,
  getTypeByUdtNamePg,
  getNormalizedTypePg,
} from './pg/utils-pg';

export { getInsertSqlPg } from './pg/get-sql/insert';

export { getMergeSqlPg } from './pg/get-sql/merge';

export { getUpdateSqlPg } from './pg/get-sql/update';

export { insertPg, EUpdateLevel } from './pg/insert-pg';

export { getResetSequenceSqlPg } from './pg/get-sql/reset-sequence';

export { isTableOrViewExistsPg } from './pg/is-table-or-view-exists';

export {
  poolsCachePg,
  getPoolPg,
  closePoolPg,
  getDbConfigPg,
  closeAllPgConnectionsPg,
} from './pg/pool-pg';

export {
  prepareSqlStringPg,
  prepareSqlValuePg,
  prepareJsonPg,
  quoteStringPg,
} from './pg/prepare-value';

export { queryPg } from './pg/query-pg';

export {
  getFieldsAndValuesPg,
  getTableSchemaPg,
  getSimpleTableDDL,
} from './pg/table-schema-pg';
