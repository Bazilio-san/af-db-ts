// noinspection SqlResolve
import { DateTime } from 'luxon';
import { getBool } from 'af-tools-ts';
import { IFieldDefPg } from '../@types/i-pg';
import { NULL } from '../common';
import { dateTimeValue, getDatetimeWithPrecisionAndOffset } from '../utils/utils-dt';
import { prepareBigIntNumber, prepareFloatNumber, prepareIntNumber, prepareNumeric } from '../utils/utils-num';
import { IFieldDef } from '../@types/i-common';
import { binToHexString, prepareJSON, prepareUUID, q } from '../utils/utils';
import { arrayToJsonList } from '../utils/utils-array';

export const quoteStringPg = (value: string): string => {
  if (value == null) {
    return NULL;
  }
  return /['\\]|\${2,}/.test(value) ? `$s$${value}$s$` : `'${value}'`;
};

export const prepareSqlStringPg = (value: any, fieldDef: IFieldDefPg): string | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  let v = String(value);
  const { length = 0, noQuotes } = fieldDef;
  if (length > 0 && v.length > length) {
    v = v.substring(0, length);
  }
  if (noQuotes) {
    return v;
  }
  return quoteStringPg(v);
};

const prepareDateTimeOffset = (
  value: any,
  fieldDef: IFieldDef,
): string | typeof NULL => getDatetimeWithPrecisionAndOffset({ value, fieldDef, defaultDtPrecision: 6 });

const prepareTimeOffset = (value: any, fieldDefOriginal: IFieldDefPg): string | typeof NULL => {
  const fieldDef: IFieldDefPg = { ...fieldDefOriginal, noQuotes: true };
  fieldDef.dateTimeOptions = fieldDef.dateTimeOptions || {};
  const { includeOffset = fieldDef.dataType === 'timetz' } = fieldDef.dateTimeOptions;
  fieldDef.dateTimeOptions.includeOffset = includeOffset;
  const dts = getDatetimeWithPrecisionAndOffset({ value, fieldDef, defaultDtPrecision: 6, stripTrailingZeros: true });
  return dts === NULL ? NULL : `'${dts.substring(11, dts.length)}'::${fieldDef.dataType}`;
};

export const prepareJsonPg = (value: any, dataType: 'json' | 'jsonb'): string | typeof NULL => {
  const v = prepareJSON(value);
  if (v === NULL) {
    return NULL;
  }
  return `${quoteStringPg(v)}::${dataType}`;
};

export const prepareSqlValuePg = (arg: { value: any, fieldDef: IFieldDefPg }): any => {
  const { value, fieldDef } = arg;
  if (value == null) {
    return NULL;
  }
  const fieldDefWithNoQuotes = { ...fieldDef, noQuotes: true };

  let v = value;
  const { noQuotes, dataType } = fieldDef;

  switch (dataType) {
    case 'bit':
      return getBool(value) ? '1' : '0';

    case 'bool':
    case 'boolean':
      return getBool(value) ? 'true' : 'false';

    case 'smallint':
    case 'int2':
      return prepareIntNumber(value, -32768, 32767);
    case 'int':
    case 'integer':
    case 'int4':
      return prepareIntNumber(value, -2147483648, 2147483647);
    case 'bigint':
    case 'int8':
      return prepareBigIntNumber(value);

    case 'numeric':
    case 'decimal':
      return prepareNumeric(value, fieldDef.precision, fieldDef.scale);

    case 'real':
    case 'float4':
    case 'money':
    case 'double precision':
    case 'float8':
      return prepareFloatNumber(value);

    case 'json':
    case 'jsonb':
      return prepareJsonPg(value, dataType);

    case 'uuid':
      return prepareUUID(v, true, fieldDef.noQuotes);

    case 'string':
    case 'text':
    case 'character':
    case 'char':
    case 'varchar':
    case 'character varying':
      return prepareSqlStringPg(value, fieldDef);

    case 'timestamp':
    case 'timestamp without time zone': {
      // '2023-09-05T02:23:54.105+03:00'::timestamp
      // '2023-09-05T02:23:54.105'::timestamp
      const { includeOffset = false } = fieldDef.dateTimeOptions || {}; // По умолчанию для timestamp includeOffset = false
      const str = prepareDateTimeOffset(value, { ...fieldDef, noQuotes: true, dateTimeOptions: { ...(fieldDef.dateTimeOptions || {}), includeOffset } });
      return str === NULL ? NULL : `'${str}'::timestamp`;
    }

    case 'timestamptz':
    case 'timestamp with time zone': {
      // '2023-09-05T02:23:54.105'::timestamptz
      // '2023-09-05T02:23:54.105+03:00'::timestamptz
      const str = prepareDateTimeOffset(value, fieldDefWithNoQuotes);
      return str === NULL ? NULL : `'${str}'::timestamptz`;
    }

    case 'date':
      // '2023-09-05'::date
      return dateTimeValue(value, fieldDefWithNoQuotes, (dt: DateTime) => `'${dt.toISODate()}'::date`);

    case 'timetz': // '02:22:17.368+03:00'::time
    case 'time with time zone':
    case 'time': // '02:22:17.368'::time
    case 'time without time zone':
      return prepareTimeOffset(value, fieldDef);

    case 'bytea':
      v = binToHexString(value);
      return v ? q(v, noQuotes) : NULL;

    case 'ARRAY': {
      v = arrayToJsonList(value, fieldDef.arrayType);
      if (v === NULL) {
        return NULL;
      }
      v = `{${v}}`;
      return fieldDef.noQuotes ? v : quoteStringPg(v);
    }

    case 'vector': {
      v = arrayToJsonList(value, 'number');
      if (v === NULL) {
        return NULL;
      }
      v = `[${v}]`;
      return fieldDef.noQuotes ? v : quoteStringPg(v);
    }
    // 'USER_DEFINED'
    default:
      return prepareSqlStringPg(value, fieldDef);
  }
};
