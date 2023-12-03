// noinspection SqlResolve
import { DateTime } from 'luxon';
import { EDataTypePg, IFieldDefPg } from '../@types/i-pg';
import { NULL } from '../common';
import { getLuxonDT } from '../utils/utils-dt';
import { prepareBigIntNumber, prepareFloatNumber, prepareIntNumber } from '../utils/utils-num';

//  const utc$ = (millis?: number): DateTime => DateTime.fromMillis(millis == null ? Date.now() : millis).setZone('UTC');

export const prepareSqlStringPg = (s: any): string => {
  s = String(s);
  if (/['\\]|\${2,}/.test(s)) {
    return `$s$${s}$s$`;
  }
  return `'${s}'`;
};

const dateTimeValue = (value: any, fieldDef: IFieldDefPg, fn: Function): string => {
  const luxonDate = getLuxonDT(value, fieldDef);
  return luxonDate ? fn(luxonDate) : NULL;
};

export const prepareSqlValuePg = (arg: { value: any, fieldDef: IFieldDefPg }): any => {
  const { value, fieldDef } = arg;
  if (value == null) {
    return NULL;
  }
  switch (fieldDef.dataType) {
    case EDataTypePg.boolean:
      return value ? 'true' : 'false';

    case EDataTypePg.bigint:
      return prepareBigIntNumber(value);

    case EDataTypePg.numeric:
    case EDataTypePg.real:
      return prepareFloatNumber(value);

    case EDataTypePg.integer:
      return prepareIntNumber(value, -2147483648, 2147483647);
    case EDataTypePg.smallint:
      return prepareIntNumber(value, -32768, 32767);

    case EDataTypePg.text:
    case EDataTypePg.character:
    case EDataTypePg.varchar:
    case EDataTypePg.uuid:
      return prepareSqlStringPg(value);

    case EDataTypePg.json:
    case EDataTypePg.jsonb:
      return prepareSqlStringPg(JSON.stringify(value));

    case EDataTypePg.date:
      return dateTimeValue(value, fieldDef, (dt: DateTime) => `'${dt.toISODate()}'::date`);
    case EDataTypePg.timestamptz:
    case EDataTypePg.timestamp:
      return dateTimeValue(value, fieldDef, (dt: DateTime) => `'${dt.toISO()}'::timestamptz`);

    case EDataTypePg.USER_DEFINED:
      return prepareSqlStringPg(value);

    case EDataTypePg.ARRAY: {
      let v = JSON.stringify(value);
      v = v.replace(/^\[(.*?)]$/, '{$1}');
      return prepareSqlStringPg(v);
    }
    default:
      return prepareSqlStringPg(value);
  }
};
