// noinspection SqlResolve
import { QueryResultRow } from 'pg';
import { queryPg } from './query-pg';
import { logger } from '../logger-error';
import { graceExit } from '../common';
import { EDataTypePg, IFieldDefPg, ITableSchemaPg, TRecordSchemaPg, TUniqueConstraintsPg } from '../@types/i-pg';

const tableSchemaHash: { [schemaAndTable: string]: ITableSchemaPg } = {};

const trimDoubleQuoteMarks = (s: string): string => s.replace(/^"?(.+?)"?$/, '$1');

const getRecordSchemaMs = async (connectionId: string, schemaAndTable: string): Promise<TRecordSchemaPg> => {
  const [schema, table] = schemaAndTable.split('.');
  const sql = `SELECT column_name,
                      column_default,
                      is_nullable,
                      data_type,
                      character_maximum_length,
                      numeric_precision,
                      numeric_precision_radix,
                      datetime_precision,
                      udt_name,
                      is_generated
               FROM information_schema.columns
               WHERE table_name = '${trimDoubleQuoteMarks(table)}'
                 AND table_schema = '${trimDoubleQuoteMarks(schema)}';`;
  const result = await queryPg(connectionId, sql);
  const fields = result?.rows || [];
  const recordSchema: TRecordSchemaPg = {};
  fields.forEach((fieldDef) => {
    const fieldSchema: IFieldDefPg = {
      name: fieldDef.column_name,
      isNullable: /yes/i.test(fieldDef.is_nullable || ''),
      columnDefault: fieldDef.column_default,
      hasDefault: !!fieldDef.column_default,
      dataType: fieldDef.data_type,
      maxLen: fieldDef.character_maximum_length,
      precision: fieldDef.numeric_precision,
      radix: fieldDef.numeric_precision_radix,
      dtPrecision: fieldDef.datetime_precision,
      udtName: fieldDef.udt_name,
    };
    if (fieldDef.is_generated === 'NEVER') {
      Object.entries(fieldSchema).forEach(([prop, value]) => {
        if (value == null) {
          delete fieldSchema[prop as keyof IFieldDefPg];
        }
      });
      recordSchema[fieldDef.column_name] = fieldSchema;
    }
  });
  return recordSchema;
};

const getPrimaryKey = async (connectionId: string, schemaAndTable: string): Promise<string[]> => {
  const sql = `
      SELECT a.attname as f
      FROM pg_index i
               JOIN pg_attribute a
                    ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
      WHERE i.indrelid = '${schemaAndTable}'::regclass
    AND i.indisprimary;`;
  const result = await queryPg(connectionId, sql);

  return (result?.rows || []).map(({ f }) => f);
};

const getUniqueConstraints = async (connectionId: string, schemaAndTable: string): Promise<TUniqueConstraintsPg> => {
  const [schema, table] = schemaAndTable.split('.');
  const sql = `
      SELECT UI.cn as cn, UI.cols as cols, CASE WHEN UC.cn IS NULL THEN 'UX' ELSE 'UC' END AS typ
      FROM (SELECT c.relname as cn, array_to_json(array_agg(a.attname ORDER BY a.attname)) AS cols
            FROM pg_index i
                     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
                     JOIN pg_class AS c ON c.oid = i.indexrelid
            WHERE i.indrelid = '${schemaAndTable}'::regclass
              AND i.indisunique
              AND NOT i.indisprimary
            GROUP BY c.relname) AS UI
               LEFT OUTER JOIN (SELECT ccu.constraint_name AS cn
                                FROM information_schema.table_constraints tc
                                         JOIN information_schema.constraint_column_usage AS ccu USING (constraint_schema, constraint_name)
                                         JOIN information_schema.columns AS c ON c.table_schema = tc.constraint_schema
                                    AND tc.table_name = c.table_name AND ccu.column_name = c.column_name
                                WHERE tc.table_schema = '${trimDoubleQuoteMarks(schema)}'
                                  AND tc.table_name = '${trimDoubleQuoteMarks(table)}'
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

const getSerials = async (connectionId: string, schemaAndTable: string): Promise<string[]> => {
  const [schema, table] = schemaAndTable.split('.');
  const fqName = `${trimDoubleQuoteMarks(schema)}.${trimDoubleQuoteMarks(table)}`
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

export const getTableSchemaPg = async (connectionId: string, schemaAndTable: string): Promise<ITableSchemaPg> => {
  let tableSchema = tableSchemaHash[schemaAndTable];
  if (tableSchema) {
    return tableSchema;
  }
  try {
    const recordSchema = await getRecordSchemaMs(connectionId, schemaAndTable);
    const pk = await getPrimaryKey(connectionId, schemaAndTable);
    const uc = await getUniqueConstraints(connectionId, schemaAndTable);
    const serials = await getSerials(connectionId, schemaAndTable);
    const defaults: { [fieldName: string]: string } = {};
    Object.values(recordSchema).forEach((fieldDef) => {
      const { name: f, columnDefault, hasDefault } = fieldDef;
      if (hasDefault && !serials.includes(f)) {
        defaults[f] = `${columnDefault}`;
      }
    });
    const fieldsList: string[] = Object.keys(recordSchema);
    const fieldsWoSerials: string[] = fieldsList.filter((fieldName) => !serials.includes(fieldName));

    tableSchema = {
      recordSchema, pk, uc, defaults, serials, fieldsList, fieldsWoSerials,
    };
    tableSchemaHash[schemaAndTable] = tableSchema;
  } catch (err) {
    logger.error(`Failed to get schema for table ${schemaAndTable}`);
    logger.error(err);
    await graceExit();
  }
  return tableSchema;
};

export const getFieldsAndValuesPg = <U extends QueryResultRow = QueryResultRow> (record: U, recordSchema: TRecordSchemaPg):
  {
    fields: string[],
    fieldsList: string,
    values: any[],
    positionsList: string,
    setFields: string,
    upsertFields: string
  } => {
  const recordNormalized: QueryResultRow = {};
  Object.entries(record).forEach(([f, v]) => {
    const { dataType } = recordSchema[f] || {};
    if (!dataType) {
      return;
    }
    if ((dataType === EDataTypePg.jsonb || dataType === EDataTypePg.json) && Array.isArray(v)) {
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
