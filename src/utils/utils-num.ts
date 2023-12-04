import { NULL } from '../common';

export const parseFloatNumber = (value: any): number | null => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  value = String(value).trim();
  if (!value) {
    return null;
  }
  let v: any = parseFloat(value);
  if (Number.isNaN(v)) {
    v = parseFloat(value.replace(/[^\de+-]/g, ''));
    if (Number.isNaN(v)) {
      return null;
    }
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

export const prepareIntNumber = (value: any, min: number, max: number): string | typeof NULL => `${parseIntNumber(value, min, max)}`;

// return prepareBigIntNumber(value, -9223372036854775808, 9223372036854775807);

export const prepareBigIntNumber = (value: any): string | typeof NULL => { // VVT
  if (value == null) {
    return NULL;
  }
  const v: any = parseFloat(value.replace(/[^\de+-]/g, ''));
  const bi = BigInt(v);
  return `${bi}`;
};
