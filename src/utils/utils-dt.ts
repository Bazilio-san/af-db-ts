import { DateTime } from 'luxon';
import { IFieldDefMs } from '../@types/i-ms';
import { IFieldDefPg } from '../@types/i-pg';
import { IFieldDef } from "../@types/i-common";
import { NULL } from "../common";
import { q } from "./utils";

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
      v = v.replace(/^(\d{4}-\d\d-\d\d) (\d)/, '$1T$2');
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
