/* eslint-disable max-len */
/* eslint-disable no-console */

// "America/Toronto"  -05:00
// "Europe/Berlin"    +01:00
// "Europe/Moscow"    +03:00

import { IFieldDefMs, prepareSqlValueMs } from '../../../src';

describe('prepare sql value MS', () => {
  describe('boolean', () => {
    const testArr: [any, any][] = [
      [null, 'null'],
      [undefined, 'null'],
      ['%#@@!', '0'],

      [false, '0'],
      ['false', '0'],
      ['0', '0'],
      ['no', '0'],
      ['no', '0'],
      ['нет', '0'],
      [0, '0'],

      ['true', '1'],
      ['1', '1'],
      ['yes', '1'],
      ['да', '1'],
      [1, '1'],

      [-1, '1'],
      [10, '1'],
      [[], '1'],
      [[1], '1'],
      [{ a: 1 }, '1'],
      [{}, '1'],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected] = caseValues;
      const res = prepareSqlValueMs({ value, fieldDef: { dataType: 'boolean' } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('tinyint', () => {
    const testArr: [any, any][] = [
      [[1], '1'],
      ['', 'null'],
      [null, 'null'],
      [undefined, 'null'],
      ['0', '0'],
      [0, '0'],
      ['1', '1'],
      [1, '1'],
      ['-1', '0'],
      [-1, '0'],
      ['-1.6', '0'],
      ['+1.6', '2'],
      [1.6, '2'],
      ['+1.2', '1'],
      [1.2, '1'],
      ['0123', '123'],
      [12345678, '255'],
      [-12345678, '0'],

      [false, 'null'],
      [true, 'null'],
      [[], 'null'],
      [{ a: 1 }, 'null'],
      [{}, 'null'],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected] = caseValues;
      const res = prepareSqlValueMs({ value, fieldDef: { dataType: 'tinyint' } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('parse date', () => {
    const testArr: [string, string, IFieldDefMs?][] = [
      // Строки без указания таймзоны интерпретируются в указанной таймзоне
      ['2000-01-22T11:59:59.123', '2000-01-22T08:59:59.123', { dateTimeOptions: { fromZone: 'UTC' } }],

      // Строки без указания таймзоны интерпретируются в локальной таймзоне (если не указано zone)
      ['2000-01-22T11:59:59.123', '2000-01-22T11:59:59.123'],

      ['2000-01-22T11:59:59.12', '2000-01-22T11:59:59.120'],
      ['2000-01-22T11:59:59.1', '2000-01-22T11:59:59.100'],

      // Строки с указанием таймзоны
      ['2000-01-22T11:59:59.123Z', '2000-01-22T11:59:59.123'],
      ['2000-01-22T11:59:59.12+03:00', '2000-01-22T11:59:59.120'],

      ['2000-01-22T11:59:59', '2000-01-22T11:59:59.000'],
      ['2000-01-22T11:59', '2000-01-22T11:59:00.000'],

      ['2000-01-22 11:59:59.123', '2000-01-22T11:59:59.123'],
      ['2000-01-22 11:59:59.12', '2000-01-22T11:59:59.120'],
      ['2000-01-22 11:59:59.1', '2000-01-22T11:59:59.100'],
      ['2000-01-22 11:59:59', '2000-01-22T11:59:59.000'],
      ['2000-01-22 11:59', '2000-01-22T11:59:00.000'],

      ['2000-01-22 11:59:59.123', '2000-01-22T08:59:59.123Z', { dataType: 'datetimeoffset' }],
      ['2000-01-22 11:59:59.123', '2000-01-22T08:59:59.12300Z', { dataType: 'datetimeoffset', scale: 5 }],
      ['2000-01-22 11:59:59.12345', '2000-01-22T08:59:59.12345Z', { dataType: 'datetimeoffset', scale: 5 }],
      ['2000-01-22 11:59:59.12345', '2000-01-22T11:59:59.12345', { dataType: 'datetimeoffset', scale: 5, dateTimeOptions: { includeOffset: false } }],
      ['2000-01-22 11:59:59.12345', '2000-01-22T14:59:59.12345+03:00', { dataType: 'datetimeoffset', scale: 5, dateTimeOptions: { fromZone: 'UTC', setZone: 'Europe/Moscow' } }],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected, fieldDef = {}] = caseValues;

      const dateStrOut = prepareSqlValueMs({ value, fieldDef });
      test(`${value} --> ${dateStrOut}`, () => {
        expect(dateStrOut).toBe(`'${expected}'`);
      });
    });
  });
});
