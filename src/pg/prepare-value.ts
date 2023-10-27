// noinspection SqlResolve
import { DateTime } from 'luxon';
import { EDataTypePg, IFieldDefPg } from '../@types/i-pg';

const NULL = 'null';
const utc$ = (millis?: number): DateTime => DateTime.fromMillis(millis == null ? Date.now() : millis).setZone('UTC');

export const prepareSqlStringPg = (s: any): string => {
  s = String(s);
  if (/['\\]|\${2,}/.test(s)) {
    return `$s$${s}$s$`;
  }
  return `'${s}'`;
};

export const prepareSqlValuePg = (arg: {
  value: any,
  fieldDef: IFieldDefPg,
}): any => {
  const { value, fieldDef } = arg;
  if (value == null && fieldDef.isNullable) {
    return NULL;
  }
  switch (fieldDef.dataType) {
    case EDataTypePg.boolean: {
      return value ? 'true' : 'false';
    }

    case EDataTypePg.bigint: {
      return `'${value}'`;
    }

    case EDataTypePg.numeric:
    case EDataTypePg.real: {
      const v: string | number = Number(value);
      return Number.isNaN(v) ? NULL : v;
    }

    case EDataTypePg.integer:
    case EDataTypePg.smallint: {
      const v: string | number = Number(value);
      return Number.isNaN(v) ? NULL : Math.floor(v);
    }

    case EDataTypePg.text:
    case EDataTypePg.character:
    case EDataTypePg.varchar:
    case EDataTypePg.uuid: {
      return prepareSqlStringPg(value);
    }

    case EDataTypePg.json:
    case EDataTypePg.jsonb: {
      return prepareSqlStringPg(JSON.stringify(value));
    }

    case EDataTypePg.date:
    case EDataTypePg.timestamp:
    case EDataTypePg.timestamptz: {
      let v = value;
      if (value instanceof Date) {
        v = +value;
      } else if (value instanceof DateTime) {
        v = value.toMillis();
      } else if (typeof value === 'string') {
        v = DateTime.fromISO(value).toMillis();
      }
      switch (fieldDef.dataType) {
        case EDataTypePg.date: {
          return `'${typeof v === 'number' ? utc$(v).toISODate() : v}'::date`;
        }
        case EDataTypePg.timestamp:
        case EDataTypePg.timestamptz: {
          return `'${typeof v === 'number' ? utc$(v).toISO() : v}'::timestamptz`;
        }
        default:
          return `'${v}'`;
      }
    }

    case EDataTypePg.USER_DEFINED:
      return prepareSqlStringPg(value);

    case EDataTypePg.ARRAY: {
      return prepareSqlStringPg(JSON.stringify(value));
    }
    default:
      return prepareSqlStringPg(value);
  }
};
