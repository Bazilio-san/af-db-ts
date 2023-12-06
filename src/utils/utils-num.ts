import { NULL } from '../common';

export const parseFloatNumber = (value: any): number | null => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object') {
    try {
      value = JSON.stringify(value);
    } catch (err) {
      //
    }
  }
  value = String(value).trim();
  if (!value) {
    return null;
  }
  const v: any = parseFloat(value);
  if (Number.isNaN(v)) {
    return null;
  }
  return v;
};

export const prepareFloatNumber = (value: any): string | typeof NULL => `${parseFloatNumber(value)}`;

export const parseIntNumber = (value: any, min: number, max: number): number | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  let v: any = parseFloatNumber(value);
  if (v == null) {
    return NULL;
  }
  v = Math.round(v);
  if (v < min) {
    v = min;
  }
  if (v > max) {
    v = max;
  }
  return Math.floor(v);
};

export const parseIntNumberS = (
  value: any,
  type: 'tinyint' |
    'smallint' | '_int2' |
    'int' | 'integer' | '_int4' |
    'bigint' | '_int8',
): number | typeof NULL => {
  switch (type) {
    case 'tinyint':
      return parseIntNumber(value, 0, 255);
    case 'smallint':
    case '_int2':
      return parseIntNumber(value, -32768, 32767);
    case 'int':
    case 'integer':
    case '_int4':
      return parseIntNumber(value, -2147483648, 2147483647);
    case 'bigint':
    case '_int8':
      return parseIntNumber(value, -2147483648, 2147483647);
    default:
      return parseIntNumber(value, -2147483648, 2147483647);
  }
};

export const prepareIntNumber = (
  value: any,
  min: number,
  max: number,
): string | typeof NULL => `${parseIntNumber(value, min, max)}`;

export const prepareBigIntNumber = (value: any): string | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  if (typeof value === 'bigint') {
    return `${value}`;
  }
  let bi: BigInt;
  try {
    if (typeof value === 'number') {
      const v = Math.floor(value);
      bi = BigInt(v);
      return `${bi}`;
    }
    if (typeof value === 'string') {
      const v = value.replace(/^\++/, '').split(/[^\d-]/)[0].trim();
      return v ? `${BigInt(v)}` : NULL;
    }
  } catch (err) {
    //
  }
  return NULL;
};
