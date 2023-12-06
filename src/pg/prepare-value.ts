// noinspection SqlResolve
import { DateTime } from 'luxon';
import { getBool } from 'af-tools-ts';
import { IFieldDefPg } from '../@types/i-pg';
import { NULL } from '../common';
import { dateTimeValue } from '../utils/utils-dt';
import { prepareBigIntNumber, prepareFloatNumber, prepareIntNumber } from '../utils/utils-num';

//  const utc$ = (millis?: number): DateTime => DateTime.fromMillis(millis == null ? Date.now() : millis).setZone('UTC');

export const prepareSqlStringPg = (s: any, fieldDef: IFieldDefPg): string => {
  s = String(s);

  const { length = 0 } = fieldDef;
  if (length > 0 && s.length > length) {
    s = s.substring(0, length);
  }

  if (/['\\]|\${2,}/.test(s)) {
    return `$s$${s}$s$`;
  }
  return `'${s}'`;
};

// VVA q """""

export const prepareSqlValuePg = (arg: { value: any, fieldDef: IFieldDefPg }): any => {
  const { value, fieldDef } = arg;
  if (value == null) {
    return NULL;
  }
  const fieldDefWithNoQuotes = { ...fieldDef, noQuotes: true };

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

    case 'string':
    case 'text':
    case 'character':
    case 'varchar':
    case 'uuid':
      return prepareSqlStringPg(value, fieldDef);

    case 'json':
    case 'jsonb':
      return prepareSqlStringPg(JSON.stringify(value), fieldDef);

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
