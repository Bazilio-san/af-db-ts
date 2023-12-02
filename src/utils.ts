/* eslint-disable no-restricted-syntax */
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

export const removePairBrackets = (s: string): string => {
  if (!s) {
    return s;
  }
  s = s.trim().replace(/\s*\(\s*/sg, '(');
  s = s.replace(/\s*\)s*/sg, ')');
  const [, leadB = ''] = /^(\(+)/.exec(s) || [];
  if (!leadB) {
    return s;
  }
  const [, trailB = ''] = /(\)+)$/.exec(s) || [];
  const cnt = Math.min(leadB.length, trailB.length);
  for (let c = 0; c < cnt; c++) {
    s = s.substring(1, s.length - 1);
  }
  return s;
};
