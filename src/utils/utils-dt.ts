import { DateTime } from 'luxon';
import { IFieldDefMs } from '../@types/i-ms';
import { IFieldDefPg } from '../@types/i-pg';

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
    if (inputDateFormat) {
      dt = DateTime.fromFormat(v, inputDateFormat, dateTimeOptions);
    } else {
      v = v.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|\+\d{2}:\d{2})?)/img, '$1T$2');
      dt = DateTime.fromISO(v, dateTimeOptions);
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
  if (dateTimeOptions?.correctionMillis) {
    millis += dateTimeOptions.correctionMillis;
  }
  return DateTime.fromMillis(millis, dateTimeOptions?.zone ? { zone: dateTimeOptions.zone } : undefined);
};
