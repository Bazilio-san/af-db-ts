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
  IDbOptionsPg,
  IDbOptionsMs,
} from './@types/i-config';

export { closeAllDb, graceExit, logSqlError } from './common';
export { setLogger } from './logger-error';
export { schemaTable } from './utils/utils';

// ######################### MS #####################################

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

export { getInsertSqlMs } from './ms/get-sql-insert-ms';

export { getMergeSqlMs } from './ms/get-sql-merge-ms';

export { getUpdateSqlMs } from './ms/get-sql-update-ms';

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
  EDataTypePg,
  TUniqueConstraintsPg,
  IPoolPg,
  IConnectionPoolsPg,
  IPoolClientPg,
} from './@types/i-pg';

export {
  genTableInterfacePg,
  genTableInterfacesPg,
} from './pg/gen-table-interfaces-pg';

export { getInsertSqlPg } from './pg/get-sql-insert-pg';

export { getMergeSqlPg } from './pg/get-sql-merge-pg';

export { getUpdateSqlPg } from './pg/get-sql-update-pg';

export { insertPg, EUpdateLevel } from './pg/insert';

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
} from './pg/prepare-value';

export { queryPg } from './pg/query-pg';

export {
  getFieldsAndValuesPg,
  getTableSchemaPg,
} from './pg/table-schema-pg';
