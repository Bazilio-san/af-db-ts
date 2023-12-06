import { NULL } from '../common';
import { parseFloatNumber, parseIntNumberS, prepareBigIntNumber } from './utils-num';
import { TDataTypeMs } from '../@types/i-data-types-ms';
import { TUdtNamesPg } from '../@types/i-data-types-pg';

export const arrayToJsonList = (value: any, arrayType?: TDataTypeMs | TUdtNamesPg): string | typeof NULL => {
  if (value == null) {
    return NULL;
  }
  let arr: any[] = [];
  if (Array.isArray(value) && value.length) {
    switch (arrayType) {
      case 'tinyint':
        arr = value.map((v) => parseIntNumberS(v, 'tinyint'));
        break;
      case 'smallint':
      case '_int2':
        arr = value.map((v) => parseIntNumberS(v, 'int'));
        break;
      case '_int8':
        arr = value.map((v) => prepareBigIntNumber(v));
        break;
      case '_int4':
      case 'int':
      case 'integer':
        arr = value.map((v) => parseIntNumberS(v, 'int'));
        break;
      case 'number':
      case 'numeric':
      case '_numeric':
      case 'money':
      case '_money':
      case 'smallmoney':
      case '_float4':
      case '_float8':
        arr = value.map((v) => parseFloatNumber(v));
        break;
      default: // + case 'string'
        arr = value.map((v) => {
          if (v === '') {
            return '';
          }
          return v == null ? null : v;
        })
          .map((v) => (v == null ? NULL : `"${v}"`));
        break;
    }
  }
  return arr.join(',');
};
