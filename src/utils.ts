const toSchemaTableCommon = (s: string): string => s.replace(/["[\]]/g, '');
const toSchemaTableSpec = (s: string, dbType: 'mssql' | 'ms' | 'pg'): string => {
  const [schema, table] = toSchemaTableCommon(s).split('.');
  return dbType === 'pg' ? `"${schema}"."${table}"` : `[${schema}].[${table}]`;
};

export const schemaTable = {
  to: {
    common: toSchemaTableCommon,
    spec: toSchemaTableSpec,
    pg: (s: string): string => toSchemaTableSpec(s, 'pg'),
    ms: (s: string): string => toSchemaTableSpec(s, 'ms'),
  },
};
