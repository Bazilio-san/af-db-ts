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

export {
  IFieldSchemaMs,
  IGetValueForSqlArgsMs,
  IConnectionPoolsMs,
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
  TGetPoolConnectionOptionsMs,
} from './@types/i-ms';

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
  getValueForSqlMs,
  binToHexString,
  getValueForSQL,
} from './mssql/get-value-for-sql';

export {
  getPoolConnectionMs,
  closeAllDbConnectionsMs,
  closeDbConnectionsAndExitMs,
  closeDbConnectionsMs,
  getDbConfigMs,
  getPoolMs,
  poolsCacheMs,
  closeAllDbConnections,
  closeDbConnectionsAndExit,
} from './mssql/pool-ms';

export { queryMs } from './mssql/query-ms';

export {
  prepareSqlStringMs,
  correctRecordSchemaMs,
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

export { mssqlEscape } from './mssql/utils';

export { getMergeSqlPg } from './pg/get-merge-sql';

export { getUpdateSqlPg } from './pg/get-update-sql';

export { insertPg, EUpdateLevel } from './pg/insert';

export { isTableOrViewExistsPg } from './pg/is-table-or-view-exists';

export {
  poolsCachePg,
  getPoolPg,
  closePoolPg,
  getDbConfigPg,
  closeAllPgConnectionsPg,
} from './pg/pg-pool';

export { prepareSqlStringPg, prepareSqlValuePg } from './pg/prepare-value';

export { queryPg } from './pg/query-pg';

export { getFieldsAndValuesPg, getTableSchemaPg } from './pg/table-schema';

export { closeAllDb, graceExit, logSqlError } from './common';

export { setLogger } from './logger-error';
export { schemaTable } from './utils';
