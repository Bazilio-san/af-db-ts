import * as sql from 'mssql';
import { getBool } from 'af-tools-ts';
import { DateTime } from 'luxon';
import { NULL } from '../common';
import { parseFloatNumber, parseIntNumberS, prepareBigIntNumber } from './utils-num';
import { TDataTypeMs } from '../@types/i-data-types-ms';
import { TDataTypePg } from '../@types/i-data-types-pg';
import { prepareUUID } from './utils';

const toDateTime = (v: any): DateTime | null => {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return DateTime.fromJSDate(v);
    // return DateTime.fromJSDate(v).toUTC().toISO({ includeOffset: true });
  }
  if (v.isLuxonDateTime) {
    return v;
  }
  if (v._isAMomentObject) {
    return DateTime.fromJSDate(v.toDate());
  }
  return null;
};

const elementString = (value: any[]): string[] => {
  // noinspection UnnecessaryLocalVariableJS
  const arr: string[] = value.map((v) => {
    if (v == null) {
      return null;
    }
    const type = typeof v;
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return String(v);
    }
    if (type === 'object') {
      v = toDateTime(v);
      if (v?.isValid) {
        return v.toUTC().toISO({ includeOffset: true });
      }
    }
    return null;
  }).map((v) => JSON.stringify(v));
  return arr;
};

const elementUuid = (
  value: any[],
  toLower: boolean = false,
): string[] => value.map((v) => prepareUUID(v, toLower, true)).map((v) => (v === NULL ? NULL : `"${v}"`));

export const arrayToJsonList = (value: any, arrayType?: TDataTypeMs | TDataTypePg): string | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  if (!Array.isArray(value)) {
    return NULL;
  }
  let arr: any[] = [];
  if (Array.isArray(value) && value.length) {
    switch (arrayType) {
      case 'bool':
      case 'boolean': // VVQ
        arr = value.map((v) => (v == null ? NULL : getBool(v)));
        break;
      case sql.Bit:
        // eslint-disable-next-line no-nested-ternary
        arr = value.map((v) => (v == null ? NULL : (getBool(v) ? 1 : 0)));
        break;
      case 'tinyint':
      case sql.TinyInt:
        arr = value.map((v) => parseIntNumberS(v, 'tinyint'));
        break;
      case 'smallint':
      case sql.SmallInt:
        arr = value.map((v) => parseIntNumberS(v, 'smallint'));
        break;
      case 'bigint':
      case sql.BigInt:
        arr = value.map((v) => prepareBigIntNumber(v));
        break;
      case 'int':
      case 'integer':
      case sql.Int:
        arr = value.map((v) => parseIntNumberS(v, 'int'));
        break;
      case 'number':
      case 'decimal':
      case 'numeric':
      case 'real':
      case 'money':
      case 'smallmoney':
      case 'float':
      case sql.SmallMoney:
      case sql.Money:
      case sql.Float:
      case sql.Numeric:
      case sql.Decimal:
      case sql.Real:
        arr = value.map((v) => parseFloatNumber(v));
        break;
      case 'uid':
      case 'uuid': // VVQ
        arr = elementUuid(value, true);
        break;
      case 'uniqueIdentifier':
      case sql.UniqueIdentifier:
        arr = elementUuid(value, false);
        break;

      case 'string':
      case 'char':
      case 'nchar':
      case 'text':
      case 'ntext':
      case 'varchar':
      case 'nvarchar':
      case 'xml':
      case sql.Char:
      case sql.NChar:
      case sql.NText:
      case sql.VarChar:
      case sql.NVarChar:
      case sql.Text:
        arr = elementString(value);
        break;

      case 'date':
      case sql.Date:
      case 'time':
      case sql.Time:
      case 'datetime':
      case sql.DateTime:
      case 'datetime2':
      case sql.DateTime2:
      case 'smalldatetime':
      case sql.SmallDateTime:
      case 'datetimeoffset':
      case sql.DateTimeOffset:
        arr = elementString(value);
        break;
      // 'binary'
      // 'varbinary'
      // 'image'
      // 'udt'
      // 'geography'
      // 'geometry'
      // 'variant'
      // 'array'
      default: {
        try {
          return JSON.stringify(value.map((v) => (v == null ? null : v))).replace(/^\[(.+?)]$/, '$1');
        } catch (err) {
          return NULL;
        }
      }
    }
  }
  return arr.join(',');
};
