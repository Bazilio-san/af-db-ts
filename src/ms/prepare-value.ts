// noinspection SqlResolve
import { DateTime } from 'luxon';
import { echo } from 'af-echo-ts';
import { getBool } from 'af-tools-ts';
import * as sql from 'mssql';
import { IFieldDefMs } from '../@types/i-ms';
import { q } from '../utils/utils';
import { getLuxonDT } from '../utils/utils-dt';
import { prepareBigIntNumber, prepareFloatNumber, prepareIntNumber } from '../utils/utils-num';
import { NULL } from '../common';
import { IFieldDef } from '../@types/i-common';

/**
 * Подготовка строки для передачи в SQL
 */
export const prepareSqlStringMs = (value: any, fieldDef: IFieldDefMs): string | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  let v = String(value);
  v = v.replace(/'/g, `''`);
  if (!fieldDef.escapeOnlySingleQuotes) {
    v = v.replace(/%/g, '%%');
  }
  const { length = 0, noQuotes } = fieldDef;
  if (length > 0 && v.length > length) {
    v = v.substring(0, length);
  }
  return q(v, noQuotes);
};

const dateTimeValue = (value: any, fieldDef: IFieldDef, fn: Function): string | typeof NULL => {
  const luxonDate = getLuxonDT(value, fieldDef);
  if (!luxonDate) {
    return NULL;
  }
  const v = fn(luxonDate);
  return q(v, fieldDef.noQuotes);
};

const prepareDatetimeOffset = (value: any, fieldDef: IFieldDefMs): string | 'null' => {
  const dt = getLuxonDT(value, fieldDef);
  if (!dt) {
    return NULL;
  }
  // В зависимости от fieldDef.dateTimeOptions.setZone строка будет в
  // соответствующем поясе. По умолчанию - в локальном.
  const isoZ = dt.toISO({ includeOffset: true }) || ''; // 2000-01-22T14:59:59.123+03:00
  const iso = isoZ.substring(0, 19); // 2000-01-22T14:59:59

  // Миллисекунды
  let sss = '';
  if (typeof value === 'string') {
    // Если во входных данных строка с миллисекундами, то берем их с той же точностью.
    const re = /\.(\d+)(?=[^.]*$)/;
    const [, fracSeconds = ''] = re.exec(value) || [];
    sss = `${fracSeconds}0000000`.substring(0, 7);
  } else {
    sss = `${isoZ.substring(20, 23)}0000`;
  }
  const scale = fieldDef.scale == null ? 3 : fieldDef.scale;
  const dotMillis = !scale ? '' : `.${sss}`.substring(0, scale + 1);

  const { includeOffset = true } = fieldDef.dateTimeOptions || {};
  const offset = includeOffset ? isoZ.substring(23, isoZ.length) : ''; // +03:00

  const str = `${iso}${dotMillis}${offset}`;
  return q(str, fieldDef.noQuotes);
};

const functionRef = `(${__filename}::prepareSqlValueMs())`;

const binToHexString = (value: any) => (value ? `0x${value.toString(16).toUpperCase()}` : null);

const array = (value: any, fieldDef: IFieldDefMs): string => {
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
}): string | number | typeof NULL => {
  const { value, fieldDef } = arg;
  if (value == null) {
    return NULL;
  }
  const { length = 0, noQuotes } = fieldDef;
  let { dataType } = fieldDef;
  if (typeof dataType === 'string') {
    dataType = dataType.toLowerCase();
  }
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
      return prepareBigIntNumber(value);

    case 'number':
    case sql.Decimal:
    case sql.Float:
    case sql.Money:
    case sql.Numeric:
    case sql.SmallMoney:
    case sql.Real:
      return prepareFloatNumber(value);

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
    case sql.DateTime:
    case sql.DateTime2: {
      const { includeOffset = false } = fieldDef.dateTimeOptions || {};
      // 2023-09-05T02:23:54.105
      return dateTimeValue(value, fieldDef, (dt: DateTime) => dt.toISO({ includeOffset }));
    }

    case 'date':
    case sql.Date:
      // 2023-09-05
      return dateTimeValue(value, fieldDef, (dt: DateTime) => dt.toISODate());

    case 'time':
    case sql.Time:
      // 02:22:17.368
      return dateTimeValue(value, fieldDef, (dt: DateTime) => dt.toISOTime()?.substring(0, 12));

    case sql.SmallDateTime:
      // 2023-09-05T02:20:00
      return dateTimeValue(value, fieldDef, (dt: DateTime) => `${dt.toISO()?.substring(0, 17)}00`);

    case 'datetimeoffset':
    case sql.DateTimeOffset:
      // 2023-09-05T02:20:00.1234567Z
      return prepareDatetimeOffset(value, fieldDef);

    case sql.Binary:
    case sql.VarBinary:
    case sql.Image:
      v = binToHexString(value);
      return v ? q(v, noQuotes) : NULL;

    case sql.UDT:
    case sql.Geography:
    case sql.Geometry:
    case sql.Variant:
      return prepareSqlStringMs(v, fieldDef);

    case 'array':
      return array(value, fieldDef);

    default:
      return prepareSqlStringMs(v, fieldDef);
  }
};
