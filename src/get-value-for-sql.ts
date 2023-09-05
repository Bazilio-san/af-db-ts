import { DateTime } from 'luxon';
import { getBool, rn } from 'af-tools-ts';
import { IGetValueForSQLArgs, IPrepareSqlStringArgs } from './interfaces';
import { prepareSqlString, sql } from './sql';
import { mssqlEscape, q } from './utils';

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

/**
 * Возвращает значение, готовое для использования в строке SQL запроса
 */
export const getValueForSQL = (args: IGetValueForSQLArgs): string | number | null => {
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
    name,
  } = fieldSchema;
  let val;
  const IS_POSTGRES = args.dialect === 'pg';

  if (escapeOnlySingleQuotes == null) {
    ({ escapeOnlySingleQuotes } = fieldSchema);
  }
  if (escapeOnlySingleQuotes == null) {
    escapeOnlySingleQuotes = false;
  }

  function prepareNumber (min: number, max: number, value_ = value) {
    if (value_ === 'null' || value_ == null || Number.isNaN(value_)) {
      if (nullable) {
        return 'NULL';
      }
      return (defaultValue || defaultValue === 0) ? `${defaultValue}` : null;
    }
    val = Number(value_);
    if (needValidate && (val < min || val > max)) {
      // throwValidateError()
      throw new Error(`Type [${type}] validate error. Value: ${val} / FName: ${name}`);
    }
    return `${val}`;
  }

  const prepareSqlStringArgs: IPrepareSqlStringArgs = { value, nullable, length, defaultValue, noQuotes, escapeOnlySingleQuotes };
  switch (type) {
    case 'json':
      if (Array.isArray(value) || typeof value === 'object') {
        value = JSON.stringify(value);
      }
      return prepareSqlString({ ...prepareSqlStringArgs, value });

    case 'string':
    case sql.Char:
    case sql.NChar:
    case sql.Text:
    case sql.NText:
    case sql.VarChar:
    case sql.NVarChar:
    case sql.Xml:
      return prepareSqlString(prepareSqlStringArgs);

    case 'uid':
    case 'uuid':
    case 'uniqueIdentifier':
    case sql.UniqueIdentifier:
      if (!value || typeof value !== 'string' || !/^[A-F\d]{8}(-[A-F\d]{4}){4}[A-F\d]{8}/i.test(value)) {
        value = null;
      } else {
        value = value.substring(0, 36).toUpperCase();
      }
      return prepareSqlString({ ...prepareSqlStringArgs, value, length: 0 });

    case 'datetime':
    case 'date':
    case 'time':
    case sql.DateTime:
    case sql.DateTime2:
    case sql.Time:
    case sql.Date:
    case sql.SmallDateTime:
    case sql.DateTimeOffset: {
      let millis = 0;
      val = value;

      let inputType = getTypeOfDateInput(value); // 'string' | 'number' | 'date' | 'luxon' | 'moment' | 'any' | 'null'

      if (inputType === 'null') {
        if (nullable) {
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
      const luxonDate = DateTime.fromMillis(millis);

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
    }

    case 'boolean':
    case sql.Bit: {
      val = getBool(value);
      if (IS_POSTGRES) {
        return val ? 'true' : 'false';
      }
      return val ? '1' : '0';
    }

    case sql.TinyInt:
      return prepareNumber(0, 255);
    case 'smallint':
    case sql.SmallInt:
      return prepareNumber(-32768, 32767);
    case 'int':
    case sql.Int:
    case 'integer':
      return prepareNumber(-2147483648, 2147483647);
    case sql.BigInt:
      // eslint-disable-next-line no-loss-of-precision
      return prepareNumber(-9223372036854775808, 9223372036854775807);
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
      return prepareSqlString(prepareSqlStringArgs);
    case 'array': {
      let arr: any[] = [];
      if (Array.isArray(value) && value.length) {
        switch (arrayType) {
          case 'int':
          case 'integer':
            arr = value.map((v) => prepareNumber(-2147483648, 2147483647, v));
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
    }
    default:
      return prepareSqlString(prepareSqlStringArgs);
  }
};
