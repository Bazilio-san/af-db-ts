// noinspection SqlResolve
import { DateTime } from 'luxon';
import { getBool } from 'af-tools-ts';
import * as sql from 'mssql';
import { IFieldDefMs } from '../@types/i-ms';
import { binToHexString, prepareJSON, prepareUUID, q } from '../utils/utils';
import { dateTimeValue, getDatetimeWithPrecisionAndOffset } from '../utils/utils-dt';
import { parseIntNumberS, prepareBigIntNumber, prepareFloatNumber } from '../utils/utils-num';
import { NULL } from '../common';
import { TDataTypeMs } from '../@types/i-data-types-ms';
import { IFieldDef } from '../@types/i-common';
import { arrayToJsonList } from '../utils/utils-array';

export const escapeStringMs = (value: any, escapeOnlySingleQuotes: boolean = false): string | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  let v = String(value);
  v = v.replace(/'/g, `''`);
  if (!escapeOnlySingleQuotes) {
    v = v.replace(/%/g, '%%');
  }
  return v;
};

/**
 * Подготовка строки для передачи в SQL
 */
export const prepareSqlStringMs = (value: any, fieldDef: IFieldDefMs): string | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  let v = escapeStringMs(value, fieldDef.escapeOnlySingleQuotes);
  const { length = 0, noQuotes } = fieldDef;
  if (length > 0 && v.length > length) {
    v = v.substring(0, length);
  }
  return q(v, noQuotes);
};

const prepareDateTimeOffset = (
  value: any,
  fieldDef: IFieldDef,
): string | typeof NULL => getDatetimeWithPrecisionAndOffset(value, fieldDef);

export const prepareSqlValueMs = (arg: { value: any, fieldDef: IFieldDefMs, }): string | typeof NULL => {
  const { value, fieldDef } = arg;
  if (value == null) {
    return NULL;
  }
  const { noQuotes } = fieldDef;
  let { dataType } = fieldDef;
  if (typeof dataType === 'string') {
    dataType = dataType.toLowerCase() as TDataTypeMs;
  }
  let v: any = value;
  switch (dataType) {
    case 'bool':
    case 'boolean':
    case 'bit':
    case sql.Bit:
      return getBool(value) ? '1' : '0';

    case 'tinyint':
    case sql.TinyInt:
      return String(parseIntNumberS(value, 'tinyint'));
    case 'smallint':
    case sql.SmallInt:
      return String(parseIntNumberS(value, 'smallint'));
    case 'int':
    case 'integer':
    case sql.Int:
      return String(parseIntNumberS(value, 'int'));

    case 'bigint':
    case sql.BigInt:
      return prepareBigIntNumber(value);

    case 'number':
    case 'decimal':
    case 'float':
    case 'money':
    case 'numeric':
    case 'smallmoney':
    case 'real':
    case sql.Decimal:
    case sql.Float:
    case sql.Money:
    case sql.Numeric:
    case sql.SmallMoney:
    case sql.Real:
      return prepareFloatNumber(value);

    case 'json':
      v = prepareJSON(v);
      return v === NULL ? NULL : q(v, noQuotes);

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
      return prepareUUID(v, false, fieldDef.noQuotes);

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

    case 'smalldatetime':
    case sql.SmallDateTime:
      // 2023-09-05T02:20:00
      return dateTimeValue(value, fieldDef, (dt: DateTime) => `${dt.toISO()?.substring(0, 17)}00`);

    case 'datetimeoffset':
    case sql.DateTimeOffset:
      // 2023-09-05T02:20:00.1234567Z
      return prepareDateTimeOffset(value, fieldDef);

    case 'binary':
    case 'varbinary':
    case 'image':
    case sql.Binary:
    case sql.VarBinary:
    case sql.Image:
      v = binToHexString(value);
      return v ? q(v, noQuotes) : NULL;

    case 'udt':
    case 'geography':
    case 'geometry':
    case 'variant':
    case sql.UDT:
    case sql.Geography:
    case sql.Geometry:
    case sql.Variant:
      return prepareSqlStringMs(v, fieldDef);

    case 'array':
      v = arrayToJsonList(value, fieldDef.arrayType);
      return v === NULL ? NULL : q(`[${escapeStringMs(v)}]`, fieldDef.noQuotes);

    default:
      return prepareSqlStringMs(v, fieldDef);
  }
};
