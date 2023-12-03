// noinspection SqlResolve
import * as sql from 'mssql';
import { each } from 'af-tools-ts';
import { removePairBrackets, schemaTable } from '../utils/utils';
import { IFieldDefMs, ITableSchemaMs, TColumnsSchemaMs, TUniqueConstraintsMs } from '../@types/i-ms';
import { queryMs } from './query-ms';
import { logger } from '../logger-error';
import { graceExit } from '../common';
import { TFieldName } from '../@types/i-common';

// commonSchemaAndTable: <schema>.<table> :  Staff.nnPersones-personGuid
// schemaAndTableMs: "<schema>"."<table>" :  "Staff"."nnPersones-personGuid"

const tableSchemaHash: { [commonSchemaAndTable: string]: ITableSchemaMs } = {};

const FIELD_SCHEMA_PROPS = [
  'index',
  'name',
  'isNullable',
  'length',
  'octetLength',
  'dataType',
  'precision',
  'scale',
  'radix',
  'dtPrecision',
  'charSetName',
  'collation',
  'udtName',
  'caseSensitive',
  'readOnly',
  'arrayType',
  'inputDateFormat',
  'dateTimeOptions',
  'noQuotes',
  'escapeOnlySingleQuotes',
  'columnDefault',
];

/**
 * Корректировка схемы таблицы
 * Поля с суффиксом _json получают тип "json". Остальные корректировки берутся из fieldTypeCorrection
 * Например, для полей типа datetime можно передавать свойство inputDateFormat
 */
export const correctRecordSchemaMs = (
  columnsSchema: TColumnsSchemaMs,
  // объект корректировок
  fieldTypeCorrection?: TColumnsSchemaMs,
) => {
  each(columnsSchema, (fieldSchema: IFieldDefMs, fieldName: TFieldName) => {
    if (/_json$/i.test(fieldName)) {
      fieldSchema.dataType = 'json';
    }
    switch (fieldSchema.dataType) {
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
    each(fieldTypeCorrection, (correction: IFieldDefMs, fieldName: TFieldName) => {
      FIELD_SCHEMA_PROPS.forEach((prop) => {
        if (correction[prop] !== undefined) {
          if (!columnsSchema[fieldName]) {
            columnsSchema[fieldName] = {} as IFieldDefMs;
          }
          columnsSchema[fieldName][prop] = correction[prop];
        }
      });
    });
  }
};

const getColumnsSchemaMs_ = async (
  connectionId: string,
  commonSchemaAndTable: string,
): Promise<TColumnsSchemaMs> => {
  const [schema, table] = schemaTable.to.common(commonSchemaAndTable).split('.');
  let sqlText = `
  --
  SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    CHARACTER_OCTET_LENGTH,
    NUMERIC_PRECISION,
    NUMERIC_PRECISION_RADIX,
    NUMERIC_SCALE,
    DATETIME_PRECISION,
    CHARACTER_SET_NAME,
    COLLATION_NAME
  FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${table}' AND TABLE_SCHEMA = '${schema}';
  `;

  let res = await queryMs(connectionId, sqlText, true, `getRecordSchemaMs SQL ERROR`);
  const columnsSchema: TColumnsSchemaMs = {};
  (res?.recordset || []).forEach((fieldDef) => {
    const name = fieldDef.COLUMN_NAME;
    const columnDefault = fieldDef.COLUMN_DEFAULT != null ? removePairBrackets(fieldDef.COLUMN_DEFAULT) : undefined;
    // noinspection UnnecessaryLocalVariableJS
    const fieldSchema: IFieldDefMs = {
      name,
      isNullable: /YES/i.test(fieldDef.IS_NULLABLE || ''),
      columnDefault,
      hasDefault: columnDefault != null,
      dataType: fieldDef.DATA_TYPE,
      length: fieldDef.CHARACTER_MAXIMUM_LENGTH,
      octetLength: fieldDef.CHARACTER_OCTET_LENGTH,
      precision: fieldDef.NUMERIC_PRECISION, // VVq Числовые?
      radix: fieldDef.NUMERIC_PRECISION_RADIX,
      scale: fieldDef.NUMERIC_SCALENUMERIC_SCALE,
      dtPrecision: fieldDef.DATETIME_PRECISION,
      charSetName: fieldDef.CHARACTER_SET_NAME, // cp1251
      collation: fieldDef.COLLATION_NAME, // Cyrillic_General_BIN
    };
    columnsSchema[name] = fieldSchema;
  });

  sqlText = `/**/ SELECT TOP(1) * FROM ${schemaTable.to.ms(commonSchemaAndTable)}`;
  res = await queryMs(connectionId, sqlText, true, 'getRecordSchemaMs() SQL ERROR');
  const { columns = {} } = res?.recordset || {};
  Object.entries(columns).forEach(([fieldName, fieldDefC]) => {
    const fieldDef = columnsSchema[fieldName];
    if (fieldDef) {
      fieldDef.dataType = fieldDefC.type;
      fieldDef.udtName = fieldDefC.udt;
      fieldDef.caseSensitive = fieldDefC.caseSensitive;
      fieldDef.identity = fieldDefC.identity; // boolean;
      fieldDef.readOnly = fieldDefC.readOnly; // boolean;
    }
  });
  return columnsSchema;
};

const getPrimaryKey = async (connectionId: string, commonSchemaAndTable: string): Promise<string[]> => {
  const [schema, table] = schemaTable.to.common(commonSchemaAndTable).split('.');
  const sqlText = `
    --
    SELECT 
      C.COLUMN_NAME AS f
    FROM
      INFORMATION_SCHEMA.TABLE_CONSTRAINTS T
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE C ON C.CONSTRAINT_NAME = T.CONSTRAINT_NAME
    WHERE 
      C.TABLE_SCHEMA = '${schema}' 
      AND C.TABLE_NAME = '${table}'
      AND T.CONSTRAINT_TYPE='PRIMARY KEY'`;
  const res = await queryMs(connectionId, sqlText, true, 'getPrimaryKey() SQL ERROR');
  return (res?.recordset || []).map(({ f }) => f);
};

const getUniqueConstraints = async (connectionId: string, commonSchemaAndTable: string): Promise<TUniqueConstraintsMs> => {
  const schemaTableMs = schemaTable.to.ms(commonSchemaAndTable);
  const sqlText = `EXEC sp_helpindex '${schemaTableMs}'`;
  const res = await queryMs(connectionId, sqlText, true, 'getUniqueConstraints() SQL ERROR');
  const uc: TUniqueConstraintsMs = {};
  (res?.recordset || []).forEach((row) => {
    const { index_description: d } = row;
    const isUc = d.includes('unique') && !d.includes('primary key');
    if (isUc) {
      uc[row.index_name] = row.index_keys.split(/,\s*/);
    }
  });
  return uc;
};

const getSerials = async (connectionId: string, commonSchemaAndTable: string): Promise<string[]> => {
  const schemaTableMs = schemaTable.to.ms(commonSchemaAndTable);
  const sqlText = `
      ---
      SELECT
          idc.name,
          idc.seed_value,
          idc.increment_value,
          idc.last_value
      FROM sys.identity_columns idc
      WHERE
          idc.object_id = OBJECT_ID('${schemaTableMs}')
  `;
  const res = await queryMs(connectionId, sqlText, true, 'getUniqueConstraints() SQL ERROR');
  const serialFieldName = res?.recordset?.[0]?.name;
  return [serialFieldName];
};

export const getTableSchemaMs = async (connectionId: string, commonSchemaAndTable: string): Promise<ITableSchemaMs> => {
  let tableSchema: ITableSchemaMs = tableSchemaHash[commonSchemaAndTable];
  if (tableSchema) {
    return tableSchema;
  }
  try {
    const columnsSchema = await getColumnsSchemaMs_(connectionId, commonSchemaAndTable);
    const pk = await getPrimaryKey(connectionId, commonSchemaAndTable);
    const uc = await getUniqueConstraints(connectionId, commonSchemaAndTable);
    const serialsFields = await getSerials(connectionId, commonSchemaAndTable);
    const defaults: { [fieldName: string]: string } = {};
    Object.values(columnsSchema).forEach((fieldDef) => {
      const { name: f = '', columnDefault, hasDefault } = fieldDef;
      if (hasDefault && !serialsFields.includes(f)) {
        defaults[f] = `${columnDefault}`;
      }
    });
    const fieldsArray: string[] = Object.keys(columnsSchema);
    const readOnlyFields: string[] = Object.values(columnsSchema).filter((s) => s.readOnly).map((s) => s.name as string);
    const fieldsWoSerialsAndRO: string[] = fieldsArray.filter((f) => !serialsFields.includes(f) && !readOnlyFields.includes(f));

    tableSchema = {
      columnsSchema, pk, uc, defaults, serialsFields, fieldsArray, fieldsWoSerialsAndRO, readOnlyFields,
    };
    tableSchemaHash[commonSchemaAndTable] = tableSchema;
  } catch (err) {
    logger.error(`Failed to get schema for table ${commonSchemaAndTable}`);
    logger.error(err);
    await graceExit();
  }
  return tableSchema;
};
