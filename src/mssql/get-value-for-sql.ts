import { DateTime } from 'luxon';
import { getBool, rn } from 'af-tools-ts';
import { prepareSqlStringMs, sql } from './sql';
import { mssqlEscape, q } from './utils';
import { IGetValueForSqlArgsMs, IPrepareSqlStringArgsMs } from '../@types/i-ms';
import { IDateTimeOptionsEx } from '../@types/i-common';

export const binToHexString = (value: any) => (value ? `0x${value.toString(16).toUpperCase()}` : null);

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

const prepareNumber = (args: {
  value: any,
  defaultValue: any,
  type: any,
  min: number,
  max: number,
  nullable?: boolean,
  needValidate?: boolean,
  fieldName: string,
}) => {
  const { value, defaultValue } = args;
  if (value === 'null' || value == null || Number.isNaN(value)) {
    if (args.nullable) {
      return 'NULL';
    }
    return (defaultValue || defaultValue === 0) ? `${defaultValue}` : null;
  }
  const val = Number(value);
  if (args.needValidate && (val < args.min || val > args.max)) {
    // throwValidateError()
    throw new Error(`Type [${args.type}] validate error. Value: ${val} / FName: ${args.fieldName}`);
  }
  return `${val}`;
};

const datetime = (
  args: {
    value: any,
    type: any,
    nullable?: boolean,
    inputDateFormat?: string,
    dateTimeOptions?: IDateTimeOptionsEx,
    noQuotes?: boolean,
    scale?: number,
  },
): string | null => {
  const { value, type, inputDateFormat, dateTimeOptions, noQuotes, scale } = args;
  let millis = 0;
  let val = args.value;

  let inputType = getTypeOfDateInput(value); // 'string' | 'number' | 'date' | 'luxon' | 'moment' | 'any' | 'null'

  if (inputType === 'null') {
    if (args.nullable) {
      return 'NULL';
    }
    inputType = 'number';
    val = 0;
  } else if (inputType === 'any') {
    inputType = 'string';
    val = String(value);
  }
  switch (inputType) {
    case 'number':
      millis = val;
      break;
    case 'date':
      millis = +val;
      break;
    case 'luxon':
      millis = val.isValid ? val.toMillis() : 0;
      break;
    case 'moment':
      millis = val.isValid() ? +val : 0;
      break;
    // string and other
    default: {
      val = String(value);
      millis = (inputDateFormat
        ? DateTime.fromFormat(val, inputDateFormat, dateTimeOptions)
        : DateTime.fromISO(val, dateTimeOptions)).toMillis();
      break;
    }
  }
  millis = Math.max(millis + (dateTimeOptions?.correctionMillis || 0), 0);
  const luxonDate = DateTime.fromMillis(millis, dateTimeOptions?.zone ? { zone: dateTimeOptions.zone } : undefined);

  switch (type) {
    case 'datetime':
    case sql.DateTime:
    case sql.DateTime2:
      return q(luxonDate.toISO({ includeOffset: false }) || '', noQuotes); // 2023-09-05T02:23:54.105
    case 'time':
    case sql.Time:
      return q((luxonDate.toISOTime() || '').substring(0, 12), noQuotes); // 02:22:17.368
    case 'date':
    case sql.Date:
      return q(luxonDate.toSQLDate() || '', noQuotes); // 2023-09-05
    case sql.SmallDateTime:
      return q(`${(luxonDate.toISO() || '').substring(0, 17)}00`, noQuotes); // 2023-09-05T02:20:00
    case sql.DateTimeOffset: { // VVQ TESTS
      const dotScale = scale == null ? 3 : scale;
      const re = /\.(\d+)(?=[^.]*$)/;
      let str = luxonDate.toISO({ includeOffset: false }) || '';
      if (!dotScale) {
        str = str.replace(re, `.000`);
      } else {
        val = inputType === 'string' ? value : str;
        let [, fracSeconds = '0'] = re.exec(val) || [];
        let floatSeconds = parseFloat((`1.${fracSeconds}`));
        floatSeconds = rn(floatSeconds, dotScale);
        fracSeconds = (`${floatSeconds}0000000`).substring(2, 2 + dotScale);
        str = str.replace(re, `.${fracSeconds}`);
      }
      return q(str, noQuotes);
    }
    default:
      return q(luxonDate.toISO({ includeOffset: false }) || '', noQuotes); // 2023-09-05T02:23:54.105
  }
};

const array = (
  args: {
    value: any,
    defaultValue: any,
    type: any,
    arrayType: any,
    fieldName: string,
    nullable?: boolean,
    needValidate?: boolean,
  },
): string | null => {
  const { value, defaultValue, type, arrayType, fieldName, nullable, needValidate } = args;
  let arr: any[] = [];
  if (Array.isArray(value) && value.length) {
    switch (arrayType) {
      case 'int':
      case 'integer':
        arr = value.map((v) => prepareNumber({
          min: -2147483648, max: -2147483648, value: v, type, nullable, defaultValue, needValidate, fieldName,
        }));
        break;
      default: // + case 'string'
        arr = value.map((v) => {
          if (v === '') {
            return v;
          }
          if (v == null) {
            return null;
          }
          return mssqlEscape(String(value));
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

/**
 * Возвращает значение, готовое для использования в строке SQL запроса
 */
export const getValueForSqlMs = (args: IGetValueForSqlArgsMs): string | number | null => {
  let { value, fieldSchema, escapeOnlySingleQuotes } = args;
  const { dateTimeOptions, needValidate } = args;
  if (typeof fieldSchema === 'string') {
    fieldSchema = { type: fieldSchema };
  }
  const {
    type,
    arrayType,
    length = 0,
    scale,
    nullable = true,
    inputDateFormat,
    defaultValue,
    noQuotes = false,
    name: fieldName = '_#foo#_',
  } = fieldSchema;
  let val;
  const IS_POSTGRES = args.dialect === 'pg';

  if (escapeOnlySingleQuotes == null) {
    ({ escapeOnlySingleQuotes } = fieldSchema);
  }
  if (escapeOnlySingleQuotes == null) {
    escapeOnlySingleQuotes = false;
  }

  const _prepareNumber = (min: number, max: number, value_ = value) => prepareNumber({
    min, max, value: value_, type, nullable, defaultValue, needValidate, fieldName,
  });

  const prepareSqlStringArgs: IPrepareSqlStringArgsMs = {
    value, nullable, length, defaultValue, noQuotes, escapeOnlySingleQuotes,
  };
  switch (type) {
    case 'json':
      if (Array.isArray(value) || typeof value === 'object') {
        value = JSON.stringify(value);
      }
      return prepareSqlStringMs({ ...prepareSqlStringArgs, value });

    case 'string':
    case sql.Char:
    case sql.NChar:
    case sql.Text:
    case sql.NText:
    case sql.VarChar:
    case sql.NVarChar:
    case sql.Xml:
      return prepareSqlStringMs(prepareSqlStringArgs);

    case 'uid':
    case 'uuid':
    case 'uniqueIdentifier':
    case sql.UniqueIdentifier:
      if (!value || typeof value !== 'string' || !/^[A-F\d]{8}(-[A-F\d]{4}){4}[A-F\d]{8}/i.test(value)) {
        value = null;
      } else {
        value = value.substring(0, 36).toUpperCase();
      }
      return prepareSqlStringMs({ ...prepareSqlStringArgs, value, length: 0 });

    case 'datetime':
    case 'date':
    case 'time':
    case sql.DateTime:
    case sql.DateTime2:
    case sql.Time:
    case sql.Date:
    case sql.SmallDateTime:
    case sql.DateTimeOffset:
      return datetime({
        value, type, nullable, inputDateFormat, dateTimeOptions, noQuotes, scale,
      });
    case 'boolean':
    case sql.Bit: {
      val = getBool(value);
      if (IS_POSTGRES) {
        return val ? 'true' : 'false';
      }
      return val ? '1' : '0';
    }

    case sql.TinyInt:
      return _prepareNumber(0, 255);
    case 'smallint':
    case sql.SmallInt:
      return _prepareNumber(-32768, 32767);
    case 'int':
    case sql.Int:
    case 'integer':
      return _prepareNumber(-2147483648, 2147483647);
    case sql.BigInt:
      // eslint-disable-next-line no-loss-of-precision
      return _prepareNumber(-9223372036854775808, 9223372036854775807);
    case 'number':
    case sql.Decimal:
    case sql.Float:
    case sql.Money:
    case sql.Numeric:
    case sql.SmallMoney:
    case sql.Real:
      if (value == null) {
        if (nullable) {
          return 'NULL';
        }
        return (defaultValue || defaultValue === 0) ? `${defaultValue}` : null;
      }
      return `${value}`;
    case sql.Binary:
    case sql.VarBinary:
    case sql.Image:
      if (value == null) {
        if (nullable) {
          return 'NULL';
        }
        if (!defaultValue) return null;
      }
      return binToHexString(value);
    case sql.UDT:
    case sql.Geography:
    case sql.Geometry:
    case sql.Variant:
      return prepareSqlStringMs(prepareSqlStringArgs);
    case 'array': {
      return array({
        value, defaultValue, type, arrayType, fieldName, nullable, needValidate,
      });
    }
    default:
      return prepareSqlStringMs(prepareSqlStringArgs);
  }
};

/**
 * @deprecated since version 2.0.0
 */
export const getValueForSQL = getValueForSqlMs;