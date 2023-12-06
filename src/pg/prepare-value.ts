// noinspection SqlResolve
import { DateTime } from 'luxon';
import { getBool } from 'af-tools-ts';
import { IFieldDefPg } from '../@types/i-pg';
import { NULL } from '../common';
import { dateTimeValue } from '../utils/utils-dt';
import { prepareBigIntNumber, prepareFloatNumber, prepareIntNumber } from '../utils/utils-num';
import { q } from '../utils/utils';

export const prepareSqlStringPg = (value: any, fieldDef: IFieldDefPg): string | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  let v = String(value);
  const { length = 0, noQuotes } = fieldDef;
  if (length > 0 && v.length > length) {
    v = v.substring(0, length);
  }
  if (/['\\]|\${2,}/.test(v)) {
    return `$s$${v}$s$`;
  }
  return q(v, noQuotes);
};

// VVA q """""

export const prepareSqlValuePg = (arg: { value: any, fieldDef: IFieldDefPg }): any => {
  const { value, fieldDef } = arg;
  if (value == null) {
    return NULL;
  }
  const fieldDefWithNoQuotes = { ...fieldDef, noQuotes: true };

  let v = value;
  const { length = 0, noQuotes } = fieldDef;

  switch (fieldDef.dataType) {
    case 'bool':
    case 'boolean':
      return getBool(value) ? 'true' : 'false';

    case 'smallint':
      return prepareIntNumber(value, -32768, 32767);
    case 'int':
    case 'integer':
      return prepareIntNumber(value, -2147483648, 2147483647);
    case 'bigint':
      return prepareBigIntNumber(value);

    case 'numeric':
    case 'real':
      return prepareFloatNumber(value);

    case 'jsonb':
    case 'json': {
      if (Array.isArray(v) || typeof v === 'object') {
        v = JSON.stringify(v);
      }
      return prepareSqlStringPg(v, fieldDef);
    }

    case 'uuid':
      if (v && typeof v === 'string' && /^[A-F\d]{8}(-[A-F\d]{4}){4}[A-F\d]{8}/i.test(v)) {
        return q(v.substring(0, 36).toUpperCase(), noQuotes);
      }
      return NULL;

    case 'string':
    case 'text':
    case 'character':
    case 'varchar':
      return prepareSqlStringPg(value, fieldDef);

    case 'timestamptz':
    case 'timestamp': {
      // '2023-09-05T02:23:54.105+03:00'::timestamptz
      const { includeOffset = true } = fieldDef.dateTimeOptions || {};
      return dateTimeValue(value, fieldDefWithNoQuotes, (dt: DateTime) => `'${dt.toISO({ includeOffset })}'::timestamptz`);
    }

    case 'date':
      // '2023-09-05'::date
      return dateTimeValue(value, fieldDefWithNoQuotes, (dt: DateTime) => `'${dt.toISODate()}'::date`);
    case 'time':
      // '02:22:17.368'::time
      return dateTimeValue(value, fieldDefWithNoQuotes, (dt: DateTime) => `'${dt.toISOTime()?.substring(0, 12)}'::time`);

    case 'USER_DEFINED':
      return prepareSqlStringPg(value, fieldDef);

    case 'ARRAY': {
      let v = JSON.stringify(value);
      v = v.replace(/^\[(.*?)]$/, '{$1}');
      return prepareSqlStringPg(v, fieldDef);
    }
    default:
      return prepareSqlStringPg(value, fieldDef);
  }
};
