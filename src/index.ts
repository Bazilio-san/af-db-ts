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
export { schemaTable } from './utils';

// ######################### MS #####################################

export {
  IFieldSchemaMs,
  IGetValueForSqlArgsMs,
  IPrepareSqlStringArgsMs,
  TRecordSchemaAssocMs,
  IGetMergeSQLOptionsMs,
  IPrepareRecordForSqlArgsMs,
  IPrepareRecordParamsMs,
  ISchemaArrayMs,
  IValueForSQLPartialArgsMs,
  TFieldTypeCorrectionMs,
  ISchemaItemMs,
  TGetRecordSchemaOptionsMs,
  TGetRecordSchemaResultMs,
  TMergeResultMs,
  TMergeRulesMs,
  TRecordSchemaMs,
} from './@types/i-ms';

export {
  IFieldDefMs,
  TColumnsSchemaMs,
  ITableSchemaMs,
  TUniqueConstraintsMs,
  IConnectionPoolsMs,
  TGetPoolConnectionOptionsMs,
} from './@types/i-ms-new';

export {
  poolsCacheMs,
  getPoolConnectionMs,
  closeAllDbConnectionsMs,
  closeDbConnectionsAndExitMs,
  closeDbConnectionsMs,
  getDbConfigMs,
  getPoolMs,
} from './mssql-new/pool-ms';

export {
  prepareSqlValueMs,
  prepareSqlStringMs,
} from './mssql-new/prepare-value';

export { queryMs } from './mssql-new/query-ms';

export {
  getFieldsAndValuesMs,
  getTableSchemaMs,
  correctRecordSchemaMs,
} from './mssql-new/table-schema-ms';

// VVR ##############################################################

export {
  getRecordSchemaMs,
  wrapTransactionMs,
  serializeMs,
  getRecordValuesForSqlMs,
  getSqlSetExpressionMs,
  getSqlValuesExpressionMs,
  prepareRecordForSqlMs,
  prepareDataForSqlMs,
  getRowsAffectedMs,
  sql,
} from './mssql/sql';

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

export { getSqlMergePg } from './pg/get-sql-merge-pg';

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

export { getFieldsAndValuesPg, getTableSchemaPg } from './pg/table-schema-pg';
