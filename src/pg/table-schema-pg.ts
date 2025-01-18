// noinspection SqlResolve
import { queryPg } from './query-pg';
import { logger } from '../logger-error';
import { graceExit } from '../common';
import { IFieldDefPg, ITableSchemaPg, TColumnsSchemaPg, TUniqueConstraintsPg } from '../@types/i-pg';
import { schemaTable } from '../utils/utils';
import { TDBRecord } from '../@types/i-common';
import { TDataTypePg } from '../@types/i-data-types-pg';
import { getNormalizedTypePg, getTypeByUdtNamePg } from './utils-pg';

// commonSchemaAndTable: <schema>.<table> :  Staff.nnPersones-personGuid
// schemaAndTablePg: "<schema>"."<table>" :  "Staff"."nnPersones-personGuid"

const tableSchemaHash: { [commonSchemaAndTable: string]: ITableSchemaPg } = {};

const getColumnsSchemaPg_ = async (connectionId: string, commonSchemaAndTable: string): Promise<TColumnsSchemaPg> => {
  const [schema, table] = schemaTable.to.common(commonSchemaAndTable).split('.');
  const sql = `SELECT column_name,
                      column_default,
                      is_nullable,
                      data_type,
                      character_maximum_length,
                      numeric_precision,
                      numeric_precision_radix,
                      numeric_scale,
                      datetime_precision,
                      udt_name,
                      is_generated
               FROM information_schema.columns
               WHERE table_name = '${table}'
                 AND table_schema = '${schema}';`;
  const result = await queryPg(connectionId, sql);
  const fields = result?.rows || [];
  const columnsSchema: TColumnsSchemaPg = {};
  fields.forEach((fieldDef) => {
    const columnDefault = fieldDef.column_default != null ? fieldDef.column_default : undefined;
    const name = fieldDef.column_name;
    let dataType: TDataTypePg = getNormalizedTypePg(fieldDef.data_type);
    if (dataType === 'USER-DEFINED' || dataType === 'USER_DEFINED') {
      dataType = getTypeByUdtNamePg(fieldDef.udt_name);
    }
    const fieldSchema: IFieldDefPg = {
      name,
      isNullable: /yes/i.test(fieldDef.is_nullable || ''),
      columnDefault: fieldDef.column_default,
      hasDefault: columnDefault != null,
      dataType,
      length: fieldDef.character_maximum_length,
      precision: fieldDef.numeric_precision,
      scale: fieldDef.numeric_scale,
      radix: fieldDef.numeric_precision_radix,
      dtPrecision: fieldDef.datetime_precision,
      arrayType: dataType === 'ARRAY' ? getTypeByUdtNamePg(fieldDef.udt_name) : undefined,
      readOnly: fieldDef.is_generated === 'ALWAYS', // boolean;
    };
    Object.entries(fieldSchema).forEach(([prop, value]) => {
      if (value == null) {
        delete fieldSchema[prop as keyof IFieldDefPg];
      }
    });
    columnsSchema[name] = fieldSchema;
  });
  return columnsSchema;
};

const getPrimaryKey = async (connectionId: string, commonSchemaAndTable: string): Promise<string[]> => {
  const schemaTablePg = schemaTable.to.pg(commonSchemaAndTable);
  const sql = `
      SELECT a.attname as f
      FROM pg_index i
               JOIN pg_attribute a
                    ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
      WHERE i.indrelid = '${schemaTablePg}'::regclass
        AND i.indisprimary;`;
  const result = await queryPg(connectionId, sql);

  return (result?.rows || []).map(({ f }) => f);
};

const getUniqueConstraints = async (connectionId: string, commonSchemaAndTable: string): Promise<TUniqueConstraintsPg> => {
  const schemaTablePg = schemaTable.to.pg(commonSchemaAndTable);
  const [schema, table] = schemaTable.to.common(commonSchemaAndTable).split('.');
  const sql = `
      SELECT UI.cn as cn, UI.cols as cols, CASE WHEN UC.cn IS NULL THEN 'UX' ELSE 'UC' END AS typ
      FROM (SELECT c.relname as cn, array_to_json(array_agg(a.attname ORDER BY a.attname)) AS cols
            FROM pg_index i
                     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
                     JOIN pg_class AS c ON c.oid = i.indexrelid
            WHERE i.indrelid = '${schemaTablePg}'::regclass
              AND i.indisunique
              AND NOT i.indisprimary
            GROUP BY c.relname) AS UI
               LEFT OUTER JOIN (SELECT ccu.constraint_name AS cn
                                FROM information_schema.table_constraints tc
                                         JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
                                         JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
                                    AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
                                WHERE tc.table_schema = '${schema}'
                                  AND tc.table_name = '${table}'
                                  AND tc.constraint_type = 'UNIQUE'
                                GROUP BY ccu.constraint_name) AS UC ON UC.cn = UI.cn
      ORDER BY CASE WHEN UC.cn IS NULL THEN 2 ELSE 1 END
  `;
  const result = await queryPg(connectionId, sql);
  const uc: TUniqueConstraintsPg = {};
  result?.rows?.forEach(({ cn, cols }) => {
    uc[cn] = cols;
  });
  return uc;
};

const getSerials = async (connectionId: string, commonSchemaAndTable: string): Promise<string[]> => {
  const fqName = schemaTable.to.common(commonSchemaAndTable);
  const sql = `
      WITH fq_objects AS (SELECT c.oid,
                                 n.nspname || '.' || c.relname AS fqname,
                                 c.relkind,
                                 c.relname                     AS relation
                          FROM pg_class c
                                   JOIN pg_namespace n ON n.oid = c.relnamespace),
           sequences AS (SELECT oid, fqname FROM fq_objects WHERE relkind = 'S'),
           tables AS (SELECT oid, fqname FROM fq_objects WHERE relkind = 'r')
      SELECT t.fqname AS tbl, array_to_json(array_agg(a.attname ORDER BY a.attname)) AS cols
      FROM pg_depend d
               JOIN sequences s ON s.oid = d.objid
               JOIN tables t ON t.oid = d.refobjid
               JOIN pg_attribute a ON a.attrelid = d.refobjid and a.attnum = d.refobjsubid
      WHERE d.deptype = 'a'
        AND t.fqname = '${fqName}'
      GROUP BY t.fqname
  `;
  const result = await queryPg(connectionId, sql);
  return result?.rows?.[0]?.cols || [];
};

const getColumnCommentsPg = async (connectionId: string, commonSchemaAndTable: string): Promise<{ [columnName: string]: string }> => {
  const [schema, table] = schemaTable.to.common(commonSchemaAndTable).split('.');
  const sql = `
      SELECT a.attname     as "columnName",
             d.description as comment
      FROM pg_class c
               JOIN pg_namespace n ON c.relnamespace = n.oid
               JOIN pg_attribute a ON a.attrelid = c.oid
               LEFT JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = a.attnum
      WHERE c.relname = '${table}'
        AND n.nspname = '${schema}'
        AND a.attnum > 0;
  `;
  const result = await queryPg(connectionId, sql);
  const comments: { [columnName: string]: string } = {};

  (result?.rows || []).forEach(({ columnName, comment }) => {
    if (comment) {
      comments[columnName] = comment;
    }
  });

  return comments;
};

export const getTableSchemaPg = async (connectionId: string, commonSchemaAndTable: string): Promise<ITableSchemaPg> => {
  let tableSchema = tableSchemaHash[commonSchemaAndTable];
  if (tableSchema) {
    return tableSchema;
  }
  try {
    const columnsSchema = await getColumnsSchemaPg_(connectionId, commonSchemaAndTable);
    const pk = await getPrimaryKey(connectionId, commonSchemaAndTable);
    const uc = await getUniqueConstraints(connectionId, commonSchemaAndTable);
    const serialsFields = await getSerials(connectionId, commonSchemaAndTable);
    const comments = await getColumnCommentsPg(connectionId, commonSchemaAndTable);

    // Добавляем комментарии в columnsSchema
    Object.keys(columnsSchema).forEach((columnName) => {
      columnsSchema[columnName].comment = comments[columnName] || null;
    });

    const defaults: { [fieldName: string]: string } = {};
    Object.values(columnsSchema).forEach((fieldDef) => {
      const { name: f = '', columnDefault, hasDefault } = fieldDef;
      if (hasDefault && !serialsFields.includes(f)) {
        defaults[f] = `${columnDefault}`;
      }
    });
    const fieldsArray: string[] = Object.keys(columnsSchema);
    const readOnlyFields: string[] = Object.values(columnsSchema).filter((s) => s.readOnly).map((s) => s.name as string);
    const fieldsWoRO: string[] = fieldsArray.filter((f) => !readOnlyFields.includes(f));
    const fieldsWoSerialsAndRO: string[] = fieldsArray.filter((f) => !serialsFields.includes(f) && !readOnlyFields.includes(f));

    tableSchema = {
      columnsSchema, pk, uc, defaults, serialsFields, fieldsArray, fieldsWoRO, fieldsWoSerialsAndRO, readOnlyFields,
    };
    tableSchemaHash[commonSchemaAndTable] = tableSchema;
  } catch (err) {
    logger.error(`Failed to get schema for table ${commonSchemaAndTable}`);
    logger.error(err);
    await graceExit();
  }
  return tableSchema;
};

export const getFieldsAndValuesPg = <U extends TDBRecord = TDBRecord> (record: U, columnsSchema: TColumnsSchemaPg):
  {
    fields: string[],
    fieldsList: string,
    values: any[],
    positionsList: string,
    setFields: string,
    upsertFields: string
  } => {
  const recordNormalized: TDBRecord = {};
  Object.entries(record).forEach(([f, v]) => {
    const { dataType } = columnsSchema[f] || {};
    if (!dataType) {
      return;
    }
    if ((dataType === 'jsonb' || dataType === 'json') && Array.isArray(v)) {
      recordNormalized[f] = JSON.stringify(v);
    } else {
      recordNormalized[f] = v;
    }
  });
  const fields: string[] = Object.keys(recordNormalized);
  const fieldsList: string = fields.join(', ');
  const values: any[] = Object.values(recordNormalized);
  const positionsList: string = fields.map((__, i) => `$${++i}`).join(', ');
  const setFields: string = fields.map((f, i) => `${f} = $${++i}`).join(', ');
  const upsertFields: string = fields.map((f) => `${f} = EXCLUDED.${f}`).join(',\n');
  return {
    fields, fieldsList, values, positionsList, setFields, upsertFields,
  };
};

export const getSimpleTableDDL = async (connectionId: string, commonSchemaAndTable: string): Promise<string> => {
  const tableSchema = await getTableSchemaPg(connectionId, commonSchemaAndTable); // Предполагаем существование этой функции
  const schemaTablePg = schemaTable.to.pg(commonSchemaAndTable);
  const { columnsSchema } = tableSchema;

  const lines: string[] = [`create table ${schemaTablePg}`];
  lines.push('(');

  Object.values(columnsSchema).forEach((column) => {
    const fieldLine = `  "${column.name}" ${column.dataType}${column.isNullable ? '' : ' not null'}`;
    const withComment = column.comment ? `${fieldLine}, -- ${column.comment}` : `${fieldLine},`;
    lines.push(withComment);
  });

  // Удаляем запятую в конце списка полей (заменяем запятую последней строки)
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
  lines.push(');');
  return lines.join('\n');
};
