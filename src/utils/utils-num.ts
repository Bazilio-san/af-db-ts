import { NULL } from '../common';

export const prepareFloatNumber = (value: any): number | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  if (typeof value === 'number') {
    return value;
  }
  let v: any = parseFloat(value);
  if (Number.isNaN(v)) {
    v = parseFloat(value.replace(/[^\de+-]/g, ''));
    if (Number.isNaN(v)) {
      return NULL;
    }
  }
  return v;
};

export const prepareIntNumber = (value: any, min: number, max: number): number | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  let v: any = prepareFloatNumber(value);
  if (typeof value !== 'number') {
    return value;
  }
  if (v < min) {
    v = min;
  }
  if (v > max) {
    v = max;
  }
  return Math.floor(v);
};

// return prepareBigIntNumber(value, -9223372036854775808, 9223372036854775807);

export const prepareBigIntNumber = (value: any): string | typeof NULL => { // VVT
  if (value == null) {
    return NULL;
  }
  const v: any = parseFloat(value.replace(/[^\de+-]/g, ''));
  const bi = BigInt(v);
  return `${bi}`;
};
