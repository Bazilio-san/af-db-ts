/* eslint-disable no-restricted-syntax */

import { NULL } from '../common';

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

/**
 * Оборачивает строку в одинарные кавычки, если второй аргумент не true
 */
export const q = (val: string, noQuotes?: boolean): string => (noQuotes ? val : `'${val}'`);

export const prepareJSON = (value: any): string | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  try {
    value = JSON.stringify(value);
  } catch (err) {
    return NULL;
  }
  return value;
};

export const binToHexString = (value: any) => (value ? `0x${value.toString('hex').toUpperCase()}` : null);

export const prepareUUID = (v: any, toLower: boolean = false, noQuotes: boolean = false): string | typeof NULL => {
  if (v && typeof v === 'string' && /^[A-F\d]{8}(-[A-F\d]{4}){4}[A-F\d]{8}/i.test(v)) {
    v = v.substring(0, 36);
    v = toLower ? v.toLowerCase() : v.toUpperCase();
    return q(v, noQuotes);
  }
  return NULL;
};
