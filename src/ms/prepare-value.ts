// noinspection SqlResolve
import { DateTime } from 'luxon';
import { echo } from 'af-echo-ts';
import { getBool, rn } from 'af-tools-ts';
import * as sql from 'mssql';
import { IFieldDefMs } from '../@types/i-ms';

const NULL = 'null';

/**
 * Оборачивает строку в одинарные кавычки, если второй аргумент не true
 */
export const q = (val: string, noQuotes?: boolean): string => (noQuotes ? val : `'${val}'`);

/**
 * Подготовка строки для передачи в SQL
 */
export const prepareSqlStringMs = (value: any, fieldDef: IFieldDefMs): string | null => {
  if (value == null) {
    return value;
  }
  const { length = 0, noQuotes } = fieldDef;
  let v = String(value);
  v = v.replace(/'/g, `''`);
  if (!fieldDef.escapeOnlySingleQuotes) {
    v = v.replace(/%/g, '%%');
  }
  if (length > 0 && v.length > length) {
    v = v.substring(0, length);
  }
  return q(v, noQuotes);
};

const prepareIntNumber = (
  value: any,
  min: number,
  max: number,
) => {
  if (value == null || Number.isNaN(value)) {
    return NULL;
  }
  let v = Number(value);
  if (v < min) {
    v = min;
  }
  if (v > max) {
    v = max;
  }
  return `${Math.floor(v)}`;
};

const getTypeOfDateInput = (v: any): 'string' | 'number' | 'date' | 'luxon' | 'moment' | 'any' | 'null' => {
  const type = typeof v;
  if (type === 'string' || type === 'number') {
    return type;
  }
  if (type === 'boolean' || !v) {
    return 'null';
  }
  if (type === 'object') {
    if (Object.prototype.toString.call(v) === '[object Date]') {
      return 'date';
    }
    if (v.isLuxonDateTime) {
      return 'luxon';
    }
    if (v._isAMomentObject) {
      return 'moment';
    }
  }
  return 'any';
};

const getDTStr = (dt: DateTime, fieldDef: IFieldDefMs): string | null | undefined => {
  const { dataType } = fieldDef;
  switch (dataType) {
    case 'datetime':
    case sql.DateTime:
    case sql.DateTime2:
      return dt.toISO({ includeOffset: false }); // 2023-09-05T02:23:54.105

    case 'time':
    case sql.Time:
      return dt.toISOTime()?.substring(0, 12); // 02:22:17.368

    case 'date':
    case sql.Date:
      return dt.toSQLDate(); // 2023-09-05

    case sql.SmallDateTime: {
      const v = dt.toISO();
      return v ? `${v.substring(0, 17)}00` : v; // 2023-09-05T02:20:00
    }

    default:
      return dt.toISO({ includeOffset: false }); // 2023-09-05T02:23:54.105
  }
};

const getLuxonDT = (value: any, fieldDef: IFieldDefMs): DateTime | null => {
  const { inputDateFormat, dateTimeOptions } = fieldDef;

  let v: any;
  let millis: number | null = null;
  const inputType = getTypeOfDateInput(value); // 'number' | 'string' | 'date' | 'luxon' | 'moment' | 'any' | 'null'

  if (inputType === 'null') {
    millis = null;
  } else if (inputType === 'number' || inputType === 'date') {
    millis = +value;
  } else if (inputType === 'string' || inputType === 'any') {
    v = String(value);
    const dt = inputDateFormat
      ? DateTime.fromFormat(v, inputDateFormat, dateTimeOptions)
      : DateTime.fromISO(v, dateTimeOptions);
    millis = dt.isValid ? dt.toMillis() : null;
  } else if (inputType === 'luxon') {
    millis = value.isValid ? value.toMillis() : null;
  } else if (inputType === 'moment') {
    millis = value.isValid() ? +value : null;
  }
  if (millis == null) {
    return null;
  }
  if (dateTimeOptions?.correctionMillis) {
    millis += dateTimeOptions.correctionMillis;
  }
  return DateTime.fromMillis(millis, dateTimeOptions?.zone ? { zone: dateTimeOptions.zone } : undefined);
};

const prepareDatetime = (value: any, fieldDef: IFieldDefMs): string | null => {
  const luxonDate = getLuxonDT(value, fieldDef);
  return luxonDate ? (getDTStr(luxonDate, fieldDef) || null) : null;
};

const prepareDatetimeOffset = (value: any, fieldDef: IFieldDefMs): string | null => {
  const dotScale = fieldDef.scale == null ? 3 : fieldDef.scale;
  const re = /\.(\d+)(?=[^.]*$)/;
  const dt = getLuxonDT(value, fieldDef);
  if (!dt) {
    return null;
  }
  const str = dt.toISO({ includeOffset: false });
  if (!str) {
    return null;
  }
  if (!dotScale) {
    return str.replace(re, `.000`);
  }
  const v = typeof value === 'string' ? value : str;
  let [, fracSeconds = '0'] = re.exec(v) || [];
  let floatSeconds = parseFloat((`1.${fracSeconds}`));
  floatSeconds = rn(floatSeconds, dotScale);
  fracSeconds = (`${floatSeconds}0000000`).substring(2, 2 + dotScale);
  return str.replace(re, `.${fracSeconds}`);
};

const functionRef = `(${__filename}::prepareSqlValueMs())`;

const binToHexString = (value: any) => (value ? `0x${value.toString(16).toUpperCase()}` : null);

const array = (value: any, fieldDef: IFieldDefMs): string | null => {
  const { arrayType } = fieldDef;
  let arr: any[] = [];
  if (Array.isArray(value) && value.length) {
    switch (arrayType) {
      case 'int':
      case 'integer':
        arr = value.map((v) => prepareIntNumber(v, -2147483648, 2147483647));
        break;
      default: // + case 'string'
        arr = value.map((v) => {
          if (v === '') {
            return v;
          }
          if (v == null) {
            return null;
          }
          return prepareSqlStringMs(String(value), { ...fieldDef, noQuotes: true });
        })
          .filter((v) => v != null)
          .map((v) => `"${v}"`);
        break;
    }
  }
  if (arr.length) {
    return `{${arr.join(',')}`;
  }
  return '{}';
};

export const prepareSqlValueMs = (arg: {
  value: any,
  fieldDef: IFieldDefMs,
}): any => {
  const { value, fieldDef } = arg;
  if (value == null) {
    return NULL;
  }
  const { length = 0, noQuotes, dataType } = fieldDef;
  let v: any = value;
  switch (dataType) {
    case 'boolean':
    case sql.Bit: {
      return getBool(value) ? '1' : '0';
    }

    case 'tinyint':
    case sql.TinyInt:
      return prepareIntNumber(value, 0, 255);
    case 'smallint':
    case sql.SmallInt:
      return prepareIntNumber(value, -32768, 32767);
    case 'int':
    case 'integer':
    case sql.Int:
      return prepareIntNumber(value, -2147483648, 2147483647);
    case 'bigint':
    case sql.BigInt:
      // eslint-disable-next-line no-loss-of-precision
      return prepareIntNumber(value, -9223372036854775808, 9223372036854775807);
    case 'number':
    case sql.Decimal:
    case sql.Float:
    case sql.Money:
    case sql.Numeric:
    case sql.SmallMoney:
    case sql.Real:
      if (typeof value === 'number') {
        return `${value}`;
      }
      v = parseFloat(value);
      return Number.isNaN(v) ? NULL : `${v}`;

    case 'json': {
      if (Array.isArray(v) || typeof v === 'object') {
        v = JSON.stringify(v);
      }
      if (length > 0 && v.length > length) {
        echo.warn(`JSON field will be truncated! ${functionRef}`);
      }
      return prepareSqlStringMs(v, fieldDef);
    }

    case 'string':
    case sql.Char:
    case sql.NChar:
    case sql.Text:
    case sql.NText:
    case sql.VarChar:
    case sql.NVarChar:
    case sql.Xml:
      return prepareSqlStringMs(v, fieldDef);

    case 'uid':
    case 'uuid':
    case 'uniqueIdentifier':
    case sql.UniqueIdentifier:
      if (v && typeof v === 'string' && /^[A-F\d]{8}(-[A-F\d]{4}){4}[A-F\d]{8}/i.test(v)) {
        return q(v.substring(0, 36).toUpperCase(), noQuotes);
      }
      return NULL;

    case 'datetime':
    case 'date':
    case 'time':
    case sql.DateTime:
    case sql.DateTime2:
    case sql.Time:
    case sql.Date:
    case sql.SmallDateTime:
    case sql.DateTimeOffset: {
      v = dataType === sql.DateTimeOffset
        ? prepareDatetimeOffset(v, fieldDef)
        : prepareDatetime(v, fieldDef);
      if (v == null) {
        return NULL;
      }
      return q(v, noQuotes);
    }

    case sql.Binary:
    case sql.VarBinary:
    case sql.Image:
      v = binToHexString(value);
      return v ? q(v, noQuotes) : null;

    case sql.UDT:
    case sql.Geography:
    case sql.Geometry:
    case sql.Variant:
      return prepareSqlStringMs(v, fieldDef);

    case 'array': {
      return array(value, fieldDef);
    }

    default:
      return prepareSqlStringMs(v, fieldDef);
  }
};
