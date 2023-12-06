import { DateTime } from 'luxon';
import { IFieldDefMs } from '../@types/i-ms';
import { IFieldDefPg } from '../@types/i-pg';
import { IFieldDef } from '../@types/i-common';
import { NULL } from '../common';
import { q } from './utils';

export const getTypeOfDateInput = (v: any): 'string' | 'number' | 'date' | 'luxon' | 'moment' | 'any' | 'null' => {
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

export const getLuxonDT = (value: any, fieldDef: IFieldDefMs | IFieldDefPg): DateTime | null => {
  const { inputDateFormat, dateTimeOptions } = fieldDef;
  const { fromZone, setZone, correctionMillis = 0 } = dateTimeOptions || {};

  let v: any;
  let millis: number | null = null;
  const inputType = getTypeOfDateInput(value); // 'number' | 'string' | 'date' | 'luxon' | 'moment' | 'any' | 'null'

  if (inputType === 'null') {
    millis = null;
  } else if (inputType === 'number' || inputType === 'date') {
    millis = +value;
  } else if (inputType === 'string' || inputType === 'any') {
    v = String(value);
    let dt: DateTime;

    const zoneOpts = fromZone ? { zone: fromZone } : undefined;
    if (inputDateFormat) {
      dt = DateTime.fromFormat(v, inputDateFormat, zoneOpts);
    } else {
      v = v
        .replace(/^(\d{4}-\d\d-\d\d) (\d)/, '$1T$2')
        .replace(/(\d) +Z/, '$1Z')
        .replace(/(\d) +([+-])/, '$1$2');
      dt = DateTime.fromISO(v, zoneOpts);
    }
    millis = dt.isValid ? dt.toMillis() : null;
  } else if (inputType === 'luxon') {
    millis = value.isValid ? value.toMillis() : null;
  } else if (inputType === 'moment') {
    millis = value.isValid() ? +value : null;
  }
  if (millis == null) {
    return null;
  }
  if (correctionMillis) {
    millis += correctionMillis;
  }
  let ld = DateTime.fromMillis(millis);
  if (setZone) {
    ld = ld.setZone(setZone);
  }
  return ld;
};

export const dateTimeValue = (value: any, fieldDef: IFieldDef, fn: Function): string | typeof NULL => {
  const luxonDate = getLuxonDT(value, fieldDef);
  if (!luxonDate) {
    return NULL;
  }
  const v = fn(luxonDate);
  return q(v, fieldDef.noQuotes);
};

export const getDatetimeWithPrecisionAndOffset = (value: any, fieldDef: IFieldDef, defaultDtPrecision: number = 3): string | typeof NULL => {
  const dt = getLuxonDT(value, fieldDef);
  if (!dt) {
    return NULL;
  }
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
  const dtPrecision = fieldDef.dtPrecision == null ? defaultDtPrecision : fieldDef.dtPrecision;
  const dotMillis = !dtPrecision ? '' : `.${sss}`.substring(0, dtPrecision + 1);

  const { includeOffset = true } = fieldDef.dateTimeOptions || {};
  const offset = includeOffset ? isoZ.substring(23, isoZ.length) : ''; // +03:00

  const str = `${iso}${dotMillis}${offset}`;
  return q(str, fieldDef.noQuotes);
};
