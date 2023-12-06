/* eslint-disable max-len */
/* eslint-disable no-console */

// "America/Toronto"  -05:00
// "Europe/Berlin"    +01:00
// "Europe/Moscow"    +03:00

import { DateTime } from 'luxon';
import { IFieldDefPg, prepareSqlValuePg, TDataTypePg } from '../../../src';

const valuesAs0: [any, any][] = [
  ['0', '0'],
  [0, '0'],
];

const valuesAsIntPositive: [any, any][] = [
  ['1', '1'],
  [1, '1'],
  ['+1.6', '2'],
  [1.6, '2'],
  ['+1.2', '1'],
  [1.2, '1'],
  ['0123', '123'],
];

const valuesAsIntNegative: [any, any][] = [
  ['-1', '-1'],
  [-1, '-1'],
  ['-1.6', '-2'],
];

const valuesAsNull: [any, any][] = [
  [null, 'null'],
  [undefined, 'null'],
  ['', 'null'],
  ['u-2o', 'null'],
  [false, 'null'],
  [true, 'null'],
  [[], 'null'],
  [[1], 'null'],
  [[-1], 'null'],
  [{ a: 1 }, 'null'],
  [{}, 'null'],
];

describe('prepare sql value PG', () => {
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
      const res = prepareSqlValuePg({ value, fieldDef: { dataType: 'boolean' } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('smallint', () => {
    const testArr: [any, any][] = [
      ...valuesAs0,
      ...valuesAsIntPositive,
      ...valuesAsIntNegative,
      [12345678, '32767'],
      [-12345678, '-32768'],
      ...valuesAsNull,
    ];
    testArr.forEach((caseValues) => {
      const [value, expected] = caseValues;
      const res = prepareSqlValuePg({ value, fieldDef: { dataType: 'smallint' } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('int', () => {
    const testArr: [any, any][] = [
      ...valuesAs0,
      ...valuesAsNull,
      ...valuesAsIntPositive,
      ...valuesAsIntNegative,
      [3147483647, '2147483647'],
      [-3147483648, '-2147483648'],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected] = caseValues;
      const res = prepareSqlValuePg({ value, fieldDef: { dataType: 'int' } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('bigint', () => {
    const testArr: [any, any][] = [
      ['.6', 'null'],
      ...valuesAs0,
      ['1', '1'],
      [1, '1'],
      ['+1.6', '1'],
      [1.6, '1'],
      ['+1.2', '1'],
      [1.2, '1'],
      ['0123', '123'],
      ['-1', '-1'],
      [-1, '-1'],
      ['-1.6', '-1'],
      // Макс числа без варнинга об потере точности
      [-9223372036854775808, '-9223372036854775808'],
      [9223372036854775800, '9223372036854775808'], // ! на конце появляется 8

      // Приводятся к максимальному и минимальному числам не BigInt
      // eslint-disable-next-line no-loss-of-precision
      [-9223372036854775809, '-9223372036854775808'],
      // eslint-disable-next-line no-loss-of-precision
      [9223372036854775807, '9223372036854775808'],

      // Приводятся к максимальному и минимальному числам не BigInt
      // eslint-disable-next-line no-loss-of-precision
      [-9223372036854775809, '-9223372036854775808'],
      // eslint-disable-next-line no-loss-of-precision
      [9223372036854775807, '9223372036854775808'],

      [-1234567890123456, '-1234567890123456'],
      [1234567890123456, '1234567890123456'],

      // n
      [9223372036854775800n, '9223372036854775800'],
      [-9223372036854775808n, '-9223372036854775808'],

      [9223372036854775807n, '9223372036854775807'],
      [-9223372036854775809n, '-9223372036854775809'],

      [-1, '-1'],
      [3101019223372036854775807n, '3101019223372036854775807'],
      [-3101019223372036854775808n, '-3101019223372036854775808'],

      // String
      ['9223372036854775800', '9223372036854775800'],
      ['-9223372036854775808', '-9223372036854775808'],

      ['3101019223372036854775807', '3101019223372036854775807'],
      ['-3101019223372036854775808', '-3101019223372036854775808'],

      ...valuesAsNull,
    ];

    testArr.forEach((caseValues) => {
      const [value, expected] = caseValues;
      const res = prepareSqlValuePg({ value, fieldDef: { dataType: 'bigint' } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('numeric', () => {
    const testArr: [any, any][] = [
      ...valuesAs0,
      ...valuesAsNull,
      ['1', '1'],
      [1, '1'],
      ['+1.6', '1.6'],
      [1.6, '1.6'],
      ['-1.2', '-1.2'],
      [-1.2, '-1.2'],
      ['0123', '123'],
      ['-1', '-1'],
      [-1, '-1'],
      [12345.12345, '12345.12345'],
      [-12345.12345, '-12345.12345'],

      ['.6', '0.6'],
      ['000.6', '0.6'],

      [-9223372036854775808, '-9223372036854776000'],
      [9223372036854775800, '9223372036854776000'],
      // eslint-disable-next-line no-loss-of-precision
      [-9223.372036854775808, '-9223.372036854777'],
      // eslint-disable-next-line no-loss-of-precision
      [9223.372036854775800, '9223.372036854777'],
      [0.000000000000000000758, '7.58e-19'],
    ];

    testArr.forEach((caseValues) => {
      const [value, expected] = caseValues;
      const res = prepareSqlValuePg({ value, fieldDef: { dataType: 'numeric' } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('json', () => {
    const testArr: [any, any][] = [
      [null, 'null'],
      [undefined, 'null'],
      ['', `''`],
      ['{{}}', `'{{}}'`],
      [{ a: 1, b: '2' }, `'{"a":1,"b":"2"}'`],
      [[], `'[]'`],
      [[1, 'f'], `'[1,"f"]'`],
      [-1.2, `'-1.2'`],
      ['0123', `'0123'`],
      [1, `'1'`],
    ];

    testArr.forEach((caseValues) => {
      const [value, expected] = caseValues;
      const res = prepareSqlValuePg({ value, fieldDef: { dataType: 'json' } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('varchar(10)', () => {
    const testArr: [any, any][] = [
      [null, 'null'],
      [undefined, 'null'],
      ['', `''`],
      [`aa'aa`, `'aa''aa'`],
      [`aa%aa`, `'aa%%aa'`],
      [{ a: 1, b: '2' }, `'[object Ob'`],
      [[], `''`],
      [1, `'1'`],
      [0, `'0'`],
    ];

    testArr.forEach((caseValues) => {
      const [value, expected] = caseValues;
      const res = prepareSqlValuePg({ value, fieldDef: { dataType: 'varchar', length: 10 } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('uuid', () => {
    const testArr: [any, any][] = [
      [null, 'null'],
      [undefined, 'null'],
      ['', 'null'],
      [`edacd531-c762-45bb-b5d1-01d49219bbfd`, `'EDACD531-C762-45BB-B5D1-01D49219BBFD'`],
      [`edacd531-c762-45bb-b5d1-01d49219bbfdffff`, `'EDACD531-C762-45BB-B5D1-01D49219BBFD'`],
      [`edacd531-c762-45bb-b5d1-01d49219b`, 'null'],
      [45, 'null'],
    ];

    testArr.forEach((caseValues) => {
      const [value, expected] = caseValues;
      const res = prepareSqlValuePg({ value, fieldDef: { dataType: 'uuid' } });
      test(`${value} --> ${res}`, () => {
        expect(res).toBe(expected);
      });
    });
  });

  describe('timestamp', () => {
    const testArr: [any, string, IFieldDefPg?][] = [
      // Исходное время интерпретируется в указанной таймзоне (fromZone). Результат - в локальной
      ['2000-01-22T11:59:59.123', `'2000-01-22T14:59:59.123+03:00'`, { dateTimeOptions: { fromZone: 'UTC', includeOffset: true } }],
      ['2000-01-22T11:59:59.123', `'2000-01-22T14:59:59.123'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      // Исходное время интерпретируется в локальной таймзоне (fromZone). Результат - в локальной
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:59.123+03:00'`, { dateTimeOptions: { includeOffset: true } }],
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:59.123'`],
      // Исходное время интерпретируется в указанной таймзоне (fromZone). Результат - в указанной (setZone)
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:59.123Z'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC', includeOffset: true } }],
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:59.123'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],
      // Неполные миллисекунды
      ['2000-01-22T11:59:59.12', `'2000-01-22T11:59:59.120'`],
      ['2000-01-22T11:59:59.1', `'2000-01-22T11:59:59.100'`],

      // Строки с указанием таймзоны
      ['2000-01-22T11:59:59.123Z', `'2000-01-22T14:59:59.123'`],
      ['2000-01-22T11:59:59.12+03:00', `'2000-01-22T11:59:59.120'`],

      ['2000-01-22T11:59:59', `'2000-01-22T11:59:59.000'`],
      ['2000-01-22T11:59', `'2000-01-22T11:59:00.000'`],

      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:59.123'`],
      ['2000-01-22 11:59:59.12', `'2000-01-22T11:59:59.120'`],
      ['2000-01-22 11:59:59.1', `'2000-01-22T11:59:59.100'`],
      ['2000-01-22 11:59:59', `'2000-01-22T11:59:59.000'`],
      ['2000-01-22 11:59', `'2000-01-22T11:59:00.000'`],

      ['2000-01-22', `'2000-01-22T00:00:00.000'`],
      [new Date(2023, 1, 2, 22, 11, 59, 123), `'2023-02-02T22:11:59.123'`],
      [1675365119123, `'2023-02-02T22:11:59.123'`],
      [DateTime.fromMillis(1675365119123), `'2023-02-02T22:11:59.123'`],

      ['22:59:59.123', `'${DateTime.now().toISODate()}T22:59:59.123'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],
      ['11:59:59.1', `'${DateTime.now().toISODate()}T14:59:59.100'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['11:59:59', `'${DateTime.now().toISODate()}T11:59:59.000'`],
      ['22:59', `'${DateTime.now().plus({ day: 1 }).toISODate()}T01:59:00.000'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      ['DDDDDD', 'null'],
      [null, 'null'],
      [undefined, 'null'],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected, fDev = {}] = caseValues;
      const fieldDef = { ...fDev, dataType: 'timestamp' as TDataTypePg };
      const dateStrOut = prepareSqlValuePg({ value, fieldDef });
      test(`${value} --> ${dateStrOut}`, () => {
        expect(dateStrOut).toBe(expected);
      });
    });
  });

  describe('timestamptz', () => {
    const testArr: [any, string, IFieldDefPg?][] = [
      // Исходное время интерпретируется в указанной таймзоне (fromZone). Результат - в локальной
      ['2000-01-22T11:59:59.123', `'2000-01-22T14:59:59.123+03:00'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      // по умолчанию offset включен
      ['2000-01-22T11:59:59.123', `'2000-01-22T14:59:59.123'`, { dateTimeOptions: { fromZone: 'UTC', includeOffset: false } }],

      // Исходное время интерпретируется в локальной таймзоне (fromZone). Результат - в локальной
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:59.123+03:00'`, { dateTimeOptions: { includeOffset: true } }],
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:59.123+03:00'`],
      // Исходное время интерпретируется в указанной таймзоне (fromZone). Результат - в указанной (setZone)
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:59.123Z'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC', includeOffset: true } }],
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:59.123Z'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],
      // Неполные миллисекунды
      ['2000-01-22T11:59:59.12', `'2000-01-22T11:59:59.120+03:00'`],
      ['2000-01-22T11:59:59.1', `'2000-01-22T11:59:59.100+03:00'`],

      // Строки с указанием таймзоны
      ['2000-01-22T11:59:59.123Z', `'2000-01-22T14:59:59.123+03:00'`],
      ['2000-01-22T11:59:59.12+03:00', `'2000-01-22T11:59:59.120+03:00'`],

      ['2000-01-22T11:59:59', `'2000-01-22T11:59:59.000+03:00'`],
      ['2000-01-22T11:59', `'2000-01-22T11:59:00.000+03:00'`],

      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:59.123+03:00'`],
      ['2000-01-22 11:59:59.12', `'2000-01-22T11:59:59.120+03:00'`],
      ['2000-01-22 11:59:59.1', `'2000-01-22T11:59:59.100+03:00'`],
      ['2000-01-22 11:59:59', `'2000-01-22T11:59:59.000+03:00'`],
      ['2000-01-22 11:59', `'2000-01-22T11:59:00.000+03:00'`],

      ['2000-01-22', `'2000-01-22T00:00:00.000+03:00'`],
      [new Date(2023, 1, 2, 22, 11, 59, 123), `'2023-02-02T22:11:59.123+03:00'`],
      [1675365119123, `'2023-02-02T22:11:59.123+03:00'`],
      [DateTime.fromMillis(1675365119123), `'2023-02-02T22:11:59.123+03:00'`],

      ['22:59:59.123', `'${DateTime.now().toISODate()}T22:59:59.123Z'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],
      ['11:59:59.1', `'${DateTime.now().toISODate()}T14:59:59.100+03:00'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['11:59:59', `'${DateTime.now().toISODate()}T11:59:59.000+03:00'`],
      ['22:59', `'${DateTime.now().plus({ day: 1 }).toISODate()}T01:59:00.000+03:00'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      // ========= SCALE =============
      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:59+03:00'`, { scale: 0 }],
      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:59.1+03:00'`, { scale: 1 }],
      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:59.12+03:00'`, { scale: 2 }],
      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:59.123+03:00'`, { scale: 3 }],
      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:59.1230+03:00'`, { scale: 4 }],
      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:59.1230000+03:00'`, { scale: 7 }],
      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:59.1230000+03:00'`, { scale: 10 }],

      ['2000-01-22 11:59:59.1234567', `'2000-01-22T11:59:59.123+03:00'`],
      ['2000-01-22 11:59:59.1234567', `'2000-01-22T11:59:59.1234+03:00'`, { scale: 4 }],
      ['2000-01-22 11:59:59.1234567', `'2000-01-22T11:59:59.1234567+03:00'`, { scale: 7 }],

      // ========= SCALE, ZONE =============
      ['2000-01-22 11:59:59.123Z', `'2000-01-22T14:59:59.1230+03:00'`, { scale: 4 }],
      ['2000-01-22 11:59:59.123+05:00', `'2000-01-22T09:59:59.1230+03:00'`, { scale: 4 }],
      ['2000-01-22 11:59:59.123Z', `'2000-01-22T14:59:59.123+03:00'`],
      ['2000-01-22 11:59:59.123+05:00', `'2000-01-22T09:59:59.123+03:00'`],
      ['2000-01-22 11:59:59.123+05:00', `'2000-01-22T06:59:59.123Z'`, { dateTimeOptions: { setZone: 'UTC' } }],

      ['DDDDDD', 'null'],
      [null, 'null'],
      [undefined, 'null'],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected, fDev = {}] = caseValues;
      const fieldDef = { ...fDev, dataType: 'timestamptz' as TDataTypePg };
      const dateStrOut = prepareSqlValuePg({ value, fieldDef });
      test(`${value} --> ${dateStrOut}`, () => {
        expect(dateStrOut).toBe(expected);
      });
    });
  });

  describe('date', () => {
    const testArr: [any, string, IFieldDefPg?][] = [
      ['2000-01-22T11:59:59.123', `'2000-01-22'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['2000-01-22T11:59:59.123', `'2000-01-22'`],
      ['2000-01-22T22:59:59.123', `'2000-01-23'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['2000-01-22T22:59:59.123', `'2000-01-22'`],
      ['2000-01-22T22:59:59.123', `'2000-01-22'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],

      ['2000-01-22T11:59:59.1', `'2000-01-22'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['2000-01-22T11:59:59', `'2000-01-22'`],
      ['2000-01-22T22:59', `'2000-01-23'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      ['2000-01-22 22:59:59.123', `'2000-01-22'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],
      ['2000-01-22 11:59:59.1', `'2000-01-22'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['2000-01-22 11:59:59', `'2000-01-22'`],
      ['2000-01-22 22:59', `'2000-01-23'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      ['2000-01-22', `'2000-01-22'`],

      [new Date(2023, 1, 2, 22, 11, 59), `'2023-02-02'`],
      [1675365119123, `'2023-02-02'`],
      [DateTime.fromMillis(1675365119123), `'2023-02-02'`],

      ['DDDDDD', 'null'],
      [null, 'null'],
      [undefined, 'null'],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected, fDev = {}] = caseValues;
      const fieldDef = { ...fDev, dataType: 'date' as TDataTypePg };
      const dateStrOut = prepareSqlValuePg({ value, fieldDef });
      test(`${value} --> ${dateStrOut}`, () => {
        expect(dateStrOut).toBe(expected);
      });
    });
  });

  describe('time', () => {
    const testArr: [any, string, IFieldDefPg?][] = [
      ['2000-01-22T11:59:59.123', `'14:59:59.123'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['2000-01-22T11:59:59.123', `'11:59:59.123'`],
      ['2000-01-22T22:59:59.123', `'01:59:59.123'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['2000-01-22T22:59:59.123', `'22:59:59.123'`],
      ['2000-01-22T22:59:59.123', `'22:59:59.123'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],

      ['2000-01-22T11:59:59.1', `'14:59:59.100'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['2000-01-22T11:59:59', `'11:59:59.000'`],
      ['2000-01-22T22:59', `'01:59:00.000'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      ['2000-01-22 22:59:59.123', `'22:59:59.123'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],
      ['2000-01-22 11:59:59.1', `'14:59:59.100'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['2000-01-22 11:59:59', `'11:59:59.000'`],
      ['2000-01-22 22:59', `'01:59:00.000'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      ['2000-01-22', `'00:00:00.000'`],

      ['22:59:59.123', `'22:59:59.123'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],
      ['11:59:59.1', `'14:59:59.100'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['11:59:59', `'11:59:59.000'`],
      ['22:59', `'01:59:00.000'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      [new Date(2023, 1, 2, 22, 11, 59, 123), `'22:11:59.123'`],
      [1675365119123, `'22:11:59.123'`],
      [DateTime.fromMillis(1675365119123), `'22:11:59.123'`],

      ['DDDDDD', 'null'],
      [null, 'null'],
      [undefined, 'null'],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected, fDev = {}] = caseValues;
      const fieldDef = { ...fDev, dataType: 'time' as TDataTypePg };
      const dateStrOut = prepareSqlValuePg({ value, fieldDef });
      test(`${value} --> ${dateStrOut}`, () => {
        expect(dateStrOut).toBe(expected);
      });
    });
  });

  describe('smalldatetime', () => {
    const testArr: [any, string, IFieldDefPg?][] = [
      ['2000-01-22T11:59:59.123', `'2000-01-22T14:59:00'`, { dateTimeOptions: { fromZone: 'UTC', includeOffset: true } }],
      ['2000-01-22T11:59:59.123', `'2000-01-22T14:59:00'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:00'`, { dateTimeOptions: { includeOffset: true } }],
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:00'`],
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:00'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC', includeOffset: true } }],
      ['2000-01-22T11:59:59.123', `'2000-01-22T11:59:00'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],
      ['2000-01-22T11:59', `'2000-01-22T11:59:00'`],

      ['2000-01-22T11:59:59.123Z', `'2000-01-22T14:59:00'`],
      ['2000-01-22T11:59:59.12+03:00', `'2000-01-22T11:59:00'`],

      ['2000-01-22 11:59:59.123', `'2000-01-22T11:59:00'`],
      ['2000-01-22 11:59:59.12', `'2000-01-22T11:59:00'`],
      ['2000-01-22 11:59:59.1', `'2000-01-22T11:59:00'`],
      ['2000-01-22 11:59:59', `'2000-01-22T11:59:00'`],

      ['22:59:59.123', `'${DateTime.now().toISODate()}T22:59:00'`, { dateTimeOptions: { fromZone: 'UTC', setZone: 'UTC' } }],
      ['11:59:59.1', `'${DateTime.now().toISODate()}T14:59:00'`, { dateTimeOptions: { fromZone: 'UTC' } }],
      ['11:59:59', `'${DateTime.now().toISODate()}T11:59:00'`],
      ['22:59', `'${DateTime.now().plus({ day: 1 }).toISODate()}T01:59:00'`, { dateTimeOptions: { fromZone: 'UTC' } }],

      ['2000-01-22', `'2000-01-22T00:00:00'`],
      [new Date(2023, 1, 2, 22, 11, 59, 123), `'2023-02-02T22:11:00'`],
      [1675365119123, `'2023-02-02T22:11:00'`],
      [DateTime.fromMillis(1675365119123), `'2023-02-02T22:11:00'`],

      ['DDDDDD', 'null'],
      [null, 'null'],
      [undefined, 'null'],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected, fDev = {}] = caseValues;
      const fieldDef = { ...fDev, dataType: 'smalldatetime' as TDataTypePg };
      const dateStrOut = prepareSqlValuePg({ value, fieldDef });
      test(`${value} --> ${dateStrOut}`, () => {
        expect(dateStrOut).toBe(expected);
      });
    });
  });

  describe('binary', () => {
    const testArr: [any, string][] = [
      [Buffer.from('asdfghjkyytreew'), `'0x6173646667686A6B79797472656577'`],
      ['DDDDDD', `'0xDDDDDD'`],
      [null, 'null'],
      [undefined, 'null'],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected, fDev = {}] = caseValues;
      const fieldDef = { ...fDev, dataType: 'binary' as TDataTypePg };
      const dateStrOut = prepareSqlValuePg({ value, fieldDef });
      test(`${value} --> ${dateStrOut}`, () => {
        expect(dateStrOut).toBe(expected);
      });
    });
  });

  describe('variant', () => {
    const testArr: [any, string][] = [
      [null, 'null'],
      [undefined, 'null'],
      ['', `''`],
      [`aa'aa`, `'aa''aa'`],
      [`aa%aa`, `'aa%%aa'`],
      [{ a: 1, b: '2' }, `'[object Object]'`],
      [[], `''`],
      [1, `'1'`],
      [0, `'0'`],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected, fDev = {}] = caseValues;
      const fieldDef = { ...fDev, dataType: 'variant' as TDataTypePg };
      const dateStrOut = prepareSqlValuePg({ value, fieldDef });
      test(`${value} --> ${dateStrOut}`, () => {
        expect(dateStrOut).toBe(expected);
      });
    });
  });

  describe('array', () => {
    const testArr: [any, string, IFieldDefPg?][] = [
      [null, 'null'],
      [undefined, 'null'],
      ['', `'{}'`],
      [[1, '2', 'a', '', null], `'{1,2,null,null,null}'`, { arrayType: 'int' }],
      [[1, '2', 'a', '', null], `'{"1","2","a","",null}'`, { arrayType: 'string' }],
      [{ a: 1, b: '2' }, `'{}'`],
      [[], `'{}'`],
      [1, `'{}'`],
      [0, `'{}'`],
    ];
    testArr.forEach((caseValues) => {
      const [value, expected, fDev = {}] = caseValues;
      const fieldDef = { ...fDev, dataType: 'array' as TDataTypePg };
      const dateStrOut = prepareSqlValuePg({ value, fieldDef });
      test(`${value} --> ${dateStrOut}`, () => {
        expect(dateStrOut).toBe(expected);
      });
    });
  });
});
