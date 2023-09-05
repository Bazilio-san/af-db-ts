// noinspection SqlResolve
import * as sql from 'mssql';
import { IColumnMetadata, IResult } from 'mssql';
import * as _ from 'lodash';
import { echo } from 'af-echo-ts';
import * as cache from 'memory-cache';
import * as db from './db';
import { q, mssqlEscape } from './utils';
import { getValueForSQL } from './get-value-for-sql';
import {
  IDBConfig,
  IFieldSchema,
  IGetMergeSQLOptions,
  IGetValueForSQLArgs, IPrepareArgs,
  IPrepareSqlStringArgs,
  ISchemaItem,
  TDBRecord,
  TFieldName,
  TFieldTypeCorrection,
  TGetRecordSchemaResult,
  TGetRecordSchemaOptions,
  TRecordSchema,
  TRecordSchemaAssoc,
  TRecordSet,
} from './interfaces';

export { sql };

/**
 * Подготовка строки для передачи в SQL
 */
export const prepareSqlString = (args: IPrepareSqlStringArgs): string | null => {
  const { value, defaultValue = null, length = 0, nullable = false, noQuotes = false, escapeOnlySingleQuotes = false } = args;
  if (value == null) {
    if (nullable) {
      return 'NULL';
    }
    if (defaultValue) {
      return q(defaultValue, noQuotes);
    }
    return ''; // Это нештатная ситуация, т.к. поле не получит никакого значения ( ,, )
  }
  if (value === '') {
    if (noQuotes) {
      return ''; // Это нештатная ситуация, т.к. поле не получит никакого значения ( ,, )
    }
    return `''`;
  }
  let val = mssqlEscape(String(value), escapeOnlySingleQuotes);
  if (length > 0) {
    val = val.substring(0, length);
  }
  return q(val, noQuotes);
};

const FIELD_SCHEMA_PROPS = ['index', 'name', 'length', 'type', 'scale', 'precision', 'nullable', 'caseSensitive',
  'identity', 'mergeIdentity', 'readOnly', 'inputDateFormat', 'defaultValue'];

/**
 * Корректировка схемы таблицы
 * Поля с суффиксом _json получают тип "json". Остальные корректировки берутся из fieldTypeCorrection
 * Например, для полей типа datetime можно передавать свойство inputDateFormat
 */
export const correctRecordSchema = (
  recordSchemaAssoc: TRecordSchemaAssoc,
  // объект корректировок
  fieldTypeCorrection?: TFieldTypeCorrection,
) => {
  _.each(recordSchemaAssoc, (fieldSchema: IFieldSchema, fieldName: TFieldName) => {
    if (/_json$/i.test(fieldName)) {
      fieldSchema.type = 'json';
    }
    switch (fieldSchema.type) {
      case sql.NChar:
      case sql.NText:
      case sql.NVarChar:
        if (fieldSchema.length) {
          fieldSchema.length = Math.floor(fieldSchema.length / 2);
        }
        break;
      case sql.UniqueIdentifier:
        fieldSchema.length = 36;
        break;
      default:
    }
  });
  if (fieldTypeCorrection && typeof fieldTypeCorrection === 'object') {
    _.each(fieldTypeCorrection, (correction: IFieldSchema, fieldName: TFieldName) => {
      FIELD_SCHEMA_PROPS.forEach((prop) => {
        if (correction[prop] !== undefined) {
          if (!recordSchemaAssoc[fieldName]) {
            recordSchemaAssoc[fieldName] = {} as IFieldSchema;
          }
          recordSchemaAssoc[fieldName][prop] = correction[prop];
        }
      });
    });
  }
};

/**
 * Подготовка значений записи для использования в SQL
 *
 * Все поля записи обрабатываются функцией getValueForSQL
 */
export const prepareRecordForSQL = (record: TDBRecord, args: IPrepareArgs) => {
  const { addValues4NotNullableFields, addMissingFields } = args;
  const { dateTimeOptions, needValidate, escapeOnlySingleQuotes, dialect } = args;
  const options: IGetValueForSQLArgs = { value: null, fieldSchema: '', dateTimeOptions, needValidate, escapeOnlySingleQuotes, dialect };
  args.recordSchema.forEach((fieldSchema: IFieldSchema) => {
    const { name = '_#foo#_', readOnly } = fieldSchema;
    if (readOnly) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(record, name)) {
      record[name] = getValueForSQL({ ...options, value: record[name], fieldSchema });
    } else if ((!fieldSchema.nullable && addValues4NotNullableFields) || addMissingFields) {
      record[name] = getValueForSQL({ ...options, value: null, fieldSchema });
    }
  });
};

/**
 * Подготовка данных для SQL
 *
 * Все поля всех записей обрабатываются функцией getValueForSQL
 */
export const prepareDataForSQL = (recordSet: TRecordSet, args: IPrepareArgs) => {
  if (recordSet._isPreparedForSQL) {
    return;
  }
  recordSet.forEach((record) => {
    prepareRecordForSQL(record, args);
  });
  recordSet._isPreparedForSQL = true;
};

/**
 * Возвращает рекорд, в котором все значения преобразованы в строки и подготовлены для прямой вставки в SQL
 * В частности, если значение типа строка, то оно уже заключено в одинарные кавычки
 */
export const getRecordValuesForSQL = (record: TDBRecord, recordSchema: TRecordSchema): TDBRecord => {
  const recordValuesForSQL = {};
  recordSchema.forEach((fieldSchema) => {
    const { name = '_#foo#_', readOnly } = fieldSchema;
    if (readOnly) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(record, name)) {
      recordValuesForSQL[name] = getValueForSQL({ value: record[name], fieldSchema, escapeOnlySingleQuotes: true });
    }
  });
  return recordValuesForSQL;
};

/**
 * Возвращает схему полей таблицы БД. Либо в виде объекта, либо в виде массива
 * Если asArray = true, то вернет TRecordSchema, при этом удалит поля, указанные в omitFields
 * Иначе вернет TRecordSchemaAssoc
 */
export const getRecordSchema = async (
  // ID соединения (borf|cep|hr|global)
  connectionId: string,
  // Субъект в выражении FROM для таблицы, схему которой нужно вернуть
  schemaAndTable: string,
  // Массив имен полей, которые нужно удалить из схемы (не учитывается, если asArray = false)
  options: TGetRecordSchemaOptions = {} as TGetRecordSchemaOptions,
): Promise<TGetRecordSchemaResult | undefined> => {
  const propertyPath = `schemas.${connectionId}.${schemaAndTable}`;

  let result: TGetRecordSchemaResult | undefined = cache.get(propertyPath) as TGetRecordSchemaResult | undefined;
  if (result) {
    return result;
  }
  const {
    omitFields,
    pickFields,
    fieldTypeCorrection,
    mergeRules: {
      mergeIdentity = [],
      excludeFromInsert = [],
      noUpdateIfNull = false,
      correction: mergeCorrection,
      withClause,
    } = {},
    noReturnMergeResult,
  } = options;
  const cPool = await db.getPoolConnection(connectionId, { prefix: 'getRecordSchema' });
  const request = new sql.Request(cPool);
  request.stream = false;
  let res: IResult<any>;
  try {
    res = await request.query(`SELECT TOP(1) *
                               FROM ${schemaAndTable}`);
  } catch (err) {
    echo.error(`getRecordSchema SQL ERROR`);
    echo.error(err);
    throw err;
  }
  const { columns } = res.recordset;
  const readOnlyFields = Object.entries(columns).filter(([, { readOnly: ro }]) => ro).map(([f]) => f);
  const omitFields2 = [...readOnlyFields, ...(Array.isArray(omitFields) ? omitFields : [])];
  let schemaAssoc: Partial<IColumnMetadata> = _.omit<IColumnMetadata>(columns, omitFields2);
  schemaAssoc = Array.isArray(pickFields) ? _.pick(schemaAssoc, pickFields) : schemaAssoc;
  correctRecordSchema(schemaAssoc as TRecordSchemaAssoc, fieldTypeCorrection);
  const schema: ISchemaItem[] = _.map(schemaAssoc, (fo) => (fo))
    .sort((a, b) => {
      const ai = (a?.index || 0);
      const bi = (b?.index || 0);
      if (ai > bi) return 1;
      if (ai < bi) return -1;
      return 0;
    }) as ISchemaItem[];
  const fields = schema.map((o) => o?.name).filter(Boolean) as string[];
  const fieldsList = fields.map((fName) => `[${fName}]`)
    .join(', ');

  const onClause = `(${mergeIdentity.map((fName) => (`target.[${fName}] = source.[${fName}]`))
    .join(' AND ')})`;
  const insertFields = fields.filter((fName) => (!excludeFromInsert.includes(fName)));
  const insertSourceList = insertFields.map((fName) => (`source.[${fName}]`))
    .join(', ');
  const insertFieldsList = insertFields.map((fName) => `[${fName}]`)
    .join(', ');
  const updateFields = fields.filter((fName) => (!mergeIdentity.includes(fName)));
  let updateFieldsList: string;
  if (noUpdateIfNull) {
    updateFieldsList = updateFields.map((fName) => (`target.[${fName}] = COALESCE(source.[${fName}], target.[${fName}])`)).join(', ');
  } else {
    updateFieldsList = updateFields.map((fName) => (`target.[${fName}] = source.[${fName}]`)).join(', ');
  }
  const dbConfig: IDBConfig = db.getDbConfig(connectionId) as IDBConfig;
  const dbSchemaAndTable = `[${dbConfig.database}].${schemaAndTable}`;

  result = {
    connectionId,
    dbConfig,
    schemaAndTable,
    dbSchemaAndTable,
    columns,
    schemaAssoc,
    schema,
    fields,
    insertFields,
    insertFieldsList,
    withClause,
    updateFields,
    mergeIdentity,
    getMergeSQL (packet: TRecordSet, prepareOptions: IGetMergeSQLOptions = {}): string {
      if (prepareOptions.isPrepareForSQL) {
        prepareDataForSQL(packet, { recordSchema: this.schema, ...prepareOptions });
      }
      const values = `(${packet.map((r) => (fields.map((fName) => (r[fName]))
        .join(',')))
        .join(`)\n,(`)})`;
      let mergeSQL = `
MERGE ${schemaAndTable} ${withClause || ''} AS target
USING
(
    SELECT * FROM
    ( VALUES
        ${values}
    )
    AS s (
    ${fieldsList}
    )
)
AS source
ON ${onClause}
WHEN MATCHED THEN
    UPDATE SET
        ${updateFieldsList}
    WHEN NOT MATCHED THEN
        INSERT (
        ${insertFieldsList}
        )
        VALUES (
        ${insertSourceList}
        )`;
      if (!noReturnMergeResult) {
        mergeSQL = `
${'DECLARE'} @t TABLE ( act VARCHAR(20));
DECLARE @total AS INTEGER;
DECLARE @i AS INTEGER;
DECLARE @u AS INTEGER;
${mergeSQL}
OUTPUT $action INTO @t;
SET @total = @@ROWCOUNT;
SELECT @i = COUNT(*) FROM @t WHERE act = 'INSERT';
SELECT @u = COUNT(*) FROM @t WHERE act != 'INSERT';
SELECT @total as total, @i as inserted, @u as updated;
`;
      } else {
        mergeSQL += `;\n`;
      }
      return typeof mergeCorrection === 'function' ? mergeCorrection(mergeSQL) : mergeSQL;
    },

    getInsertSQL (packet: TRecordSet, addOutputInserted = false): string {
      if (!Array.isArray(packet)) {
        packet = [packet];
      }
      const values = `(${packet.map((r) => (insertFields.map((fName) => (r[fName] === undefined ? 'NULL' : r[fName]))
        .join(',')))
        .join(`)\n,(`)})`;
      return `INSERT INTO ${schemaAndTable} (${insertFieldsList}) ${addOutputInserted ? ' OUTPUT inserted.* ' : ''} VALUES ${values}`;
    },

    getUpdateSQL (record: TRecordSet) {
      const recordForSQL = getRecordValuesForSQL(record, this.schema);
      const setArray: string[] = [];
      updateFields.forEach((fName) => {
        if (recordForSQL[fName] !== undefined) {
          setArray.push(`[${fName}] = ${recordForSQL[fName]}`);
        }
      });
      const where = `(${mergeIdentity.map((fName) => (`[${fName}] = ${recordForSQL[fName]}`))
        .join(' AND ')})`;
      return `UPDATE ${schemaAndTable}
              SET ${setArray.join(', ')}
              WHERE ${where};`;
    },
  };

  cache.put(propertyPath, result);
  return result;
};

/**
 * Оборачивает инструкции SQL в транзакцию
 */
export const wrapTransaction = (strSQL: string): string => `BEGIN TRY
    BEGIN TRANSACTION;

    ${strSQL}

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    DECLARE @ErrorMessage  NVARCHAR(MAX)
          , @ErrorSeverity INT
          , @ErrorState    INT;

    SELECT
        @ErrorMessage = ERROR_MESSAGE() + ' Line ' + CAST(ERROR_LINE() AS NVARCHAR(5))
      , @ErrorSeverity = ERROR_SEVERITY()
      , @ErrorState = ERROR_STATE();

    IF @@trancount > 0
    BEGIN
        ROLLBACK TRANSACTION;
    END;

    RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
END CATCH;`;

/**
 * Возвращает проверенное и серилизованное значение
 */
export const serialize = (value: any, fieldSchema: IFieldSchema): string | number | null => {
  const val = getValueForSQL({ value, fieldSchema });
  if (val == null || val === 'NULL') {
    return null;
  }
  if (typeof val === 'number') {
    return val;
  }
  return String(val).replace(/(^')|('$)/g, '');
};

/**
 * Возвращает подготовленное выражение SET для использования в UPDATE
 */
export const getSqlSetExpression = (record: TDBRecord, recordSchema: TRecordSchema): string => {
  const setArray: string[] = [];
  recordSchema.forEach((fieldSchema) => {
    const { name = '_#foo#_' } = fieldSchema;
    if (Object.prototype.hasOwnProperty.call(record, name)) {
      setArray.push(`[${name}] = ${getValueForSQL({ value: record[name], fieldSchema, escapeOnlySingleQuotes: true })}`);
    }
  });
  return `SET ${setArray.join(', ')}`;
};

/**
 * Возвращает подготовленное выражение (...поля...) VALUES (...значения...) для использования в INSERT
 *
 * addOutputInserted - Если true, добавляется выражение OUTPUT inserted.* перед VALUES
 */
export const getSqlValuesExpression = (record: TDBRecord, recordSchema: TRecordSchema, addOutputInserted: boolean = false): string => {
  const fieldsArray: string[] = [];
  const valuesArray: string[] = [];
  recordSchema.forEach((fieldSchema) => {
    const { name = '_#foo#_' } = fieldSchema;
    if (Object.prototype.hasOwnProperty.call(record, name)) {
      fieldsArray.push(name);
      valuesArray.push(String(getValueForSQL({ value: record[name], fieldSchema, escapeOnlySingleQuotes: true })));
    }
  });
  return `([${fieldsArray.join('], [')}]) ${addOutputInserted ? ' OUTPUT inserted.* ' : ''} VALUES (${valuesArray.join(', ')})`;
};

export const getRowsAffected = (qResult: any) => (qResult.rowsAffected && qResult.rowsAffected.reduce((a: number, v: number) => a + v, 0)) || 0;
