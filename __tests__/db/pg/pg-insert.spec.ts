import { insertPg, queryPg } from '../../../src';
import { ITestOnlyOneSerialRecord } from './@gen-types/test-only_one_serial';
import { ITestOnlyOneUniqRecord } from './@gen-types/test-only_one_uniq';
import { ITestSerialAndUniqRecord } from './@gen-types/test-serial_and_uniq';
import { ITestHardCaseRecord } from './@gen-types/test-hard_case';

const DELETE = 'DELETE';
const connectionId = 'test';

beforeAll(async () => {
  const sql = `
  ${DELETE} FROM test.hard_case WHERE permanent != True;
  SELECT setval('test.hard_case_ser1_seq', 2);
  SELECT setval('test.hard_case_ser2_seq', 2);
  
  DELETE FROM test.only_one_serial WHERE permanent != True;
  SELECT setval('test.only_one_serial_ser1_seq', 2);
  
  DELETE FROM test.only_one_uniq WHERE permanent != True;
  
  DELETE FROM test.serial_and_uniq WHERE permanent != True;
  SELECT setval('test.serial_and_uniq_ser1_seq', 2);
  `;
  await queryPg(connectionId, sql);
});

describe('insertPg()', () => {
  // only_one_serial
  test(`11 - Вставка новой записи в only_one_serial`, async () => {
    const record: ITestOnlyOneSerialRecord = {
      i1: 3,
      i2: 3,
    };
    const rowInserted = await insertPg<ITestOnlyOneSerialRecord>({ connectionId, record, target: 'test.only_one_serial' });
    expect(rowInserted?.ser1).toEqual(3);
    expect(rowInserted?.i2).toEqual(3);
  });

  test(`12 - Вставка существующей записи в only_one_serial не должна состояться`, async () => {
    const record: ITestOnlyOneSerialRecord = {
      ser1: 3,
      i1: 4,
      i2: 4,
    };
    const rowInserted = await insertPg<ITestOnlyOneSerialRecord>({ connectionId, record, target: 'test.only_one_serial' });
    expect(rowInserted?.ser1).toEqual(3);
    expect(rowInserted?.i2).toEqual(3);
    expect(rowInserted?.j).toEqual(null);
    expect(rowInserted?.jb).toEqual(null);
  });

  test(`13 - Игнорирование нового значения serial при вставка записи в only_one_serial быть должно (J)`, async () => {
    const record: ITestOnlyOneSerialRecord = {
      ser1: 8,
      i1: 4,
      i2: 4,
    };
    const rowInserted = await insertPg<ITestOnlyOneSerialRecord>({ connectionId, record, target: 'test.only_one_serial' });
    expect(rowInserted?.ser1).toEqual(4);
    expect(rowInserted?.i1).toEqual(4);
    expect(rowInserted?.i2).toEqual(4);
  });

  test(`14 - Вставка записи с объектом в поле json и jsonb`, async () => {
    const record: ITestOnlyOneSerialRecord = {
      i1: 5,
      j: { a: 'a value' },
      jb: { b: 'b value' },
    };
    const rowInserted = await insertPg<ITestOnlyOneSerialRecord>({ connectionId, record, target: 'test.only_one_serial' });
    expect(rowInserted?.ser1).toEqual(5);
    expect(rowInserted?.j).toEqual({ a: 'a value' });
    expect(rowInserted?.jb).toEqual({ b: 'b value' });
  });

  test(`15 - Вставка записи с массивом объектов в поле json и jsonb`, async () => {
    const record: ITestOnlyOneSerialRecord = {
      i1: 6,
      j: [{ a: 'a value' }, { b: 'b value' }],
      jb: [{ a: 'a value' }, { b: 'b value' }],
    };
    const rowInserted = await insertPg<ITestOnlyOneSerialRecord>({ connectionId, record, target: 'test.only_one_serial' });
    expect(rowInserted?.ser1).toEqual(6);
    expect(rowInserted?.j).toEqual([{ a: 'a value' }, { b: 'b value' }]);
    expect(rowInserted?.jb).toEqual([{ a: 'a value' }, { b: 'b value' }]);
  });

  test(`16 - Вставка записи с number в поле json и jsonb`, async () => {
    const record: ITestOnlyOneSerialRecord = {
      i1: 7,
      j: 77,
      jb: 88,
    };
    const rowInserted = await insertPg<ITestOnlyOneSerialRecord>({ connectionId, record, target: 'test.only_one_serial' });
    expect(rowInserted?.ser1).toEqual(7);
    expect(rowInserted?.j).toEqual(77);
    expect(rowInserted?.jb).toEqual(88);
  });

  // only_one_uniq
  test(`21 - Вставка новой записи в only_one_uniq`, async () => {
    const record: ITestOnlyOneUniqRecord = {
      i1: 3,
      i2: 3,
      i3: 3,
      i4: null,
    };
    const rowInserted = await insertPg<ITestOnlyOneUniqRecord>({ connectionId, record, target: 'test.only_one_uniq' });
    expect(rowInserted?.i1).toEqual(3);
    expect(rowInserted?.i2).toEqual(3);
    expect(rowInserted?.i3).toEqual(3);
    expect(rowInserted?.i4).toEqual(null);
  });

  test(`22 - Вставка существующей записи в only_one_uniq не должна состояться`, async () => {
    const record: ITestOnlyOneUniqRecord = {
      i1: 3,
      i2: 3,
      i3: 999,
      i4: 999,
    };
    const rowInserted = await insertPg<ITestOnlyOneUniqRecord>({ connectionId, record, target: 'test.only_one_uniq' });
    expect(rowInserted?.i1).toEqual(3);
    expect(rowInserted?.i2).toEqual(3);
    expect(rowInserted?.i3).toEqual(3);
    expect(rowInserted?.i4).toEqual(null);
  });

  // serial_and_uniq
  test(`31 - Вставка новой записи в serial_and_uniq`, async () => {
    const record: ITestSerialAndUniqRecord = {
      i1: 3,
      i2: 3,
      i3: 3,
      i4: null,
    };
    const rowInserted = await insertPg<ITestSerialAndUniqRecord>({ connectionId, record, target: 'test.serial_and_uniq' });
    expect(rowInserted?.ser1).toEqual(3);
    expect(rowInserted?.i1).toEqual(3);
    expect(rowInserted?.i2).toEqual(3);
    expect(rowInserted?.i3).toEqual(3);
    expect(rowInserted?.i4).toEqual(null);
  });

  test(`32 - Вставка записи в serial_and_uniq c cуществующим serial не должна состояться`, async () => {
    const record: ITestSerialAndUniqRecord = {
      ser1: 3,
      i1: 4,
      i2: 4,
      i3: 999,
      i4: 999,
    };
    const rowInserted = await insertPg<ITestSerialAndUniqRecord>({ connectionId, record, target: 'test.serial_and_uniq' });
    expect(rowInserted?.ser1).toEqual(3);
    expect(rowInserted?.i1).toEqual(3);
    expect(rowInserted?.i2).toEqual(3);
    expect(rowInserted?.i3).toEqual(3);
    expect(rowInserted?.i4).toEqual(null);
  });

  test(`33 - Вставка записи в serial_and_uniq c cуществующим uniq не должна состояться`, async () => {
    const record: ITestSerialAndUniqRecord = {
      i1: 3,
      i2: 3,
      i3: 999,
      i4: 999,
    };
    const rowInserted = await insertPg<ITestSerialAndUniqRecord>({ connectionId, record, target: 'test.serial_and_uniq' });
    expect(rowInserted?.ser1).toEqual(3);
    expect(rowInserted?.i1).toEqual(3);
    expect(rowInserted?.i2).toEqual(3);
    expect(rowInserted?.i3).toEqual(3);
    expect(rowInserted?.i4).toEqual(null);
  });

  test(`34 - Игнорирование нового значения serial при вставка записи в serial_and_uniq быть должно (J)`, async () => {
    const record: ITestSerialAndUniqRecord = {
      ser1: 8,
      i1: 4,
      i2: 4,
      i3: 4,
      i4: null,
    };
    const rowInserted = await insertPg<ITestSerialAndUniqRecord>({ connectionId, record, target: 'test.serial_and_uniq' });
    expect(rowInserted?.ser1).toEqual(4);
    expect(rowInserted?.i1).toEqual(4);
    expect(rowInserted?.i2).toEqual(4);
    expect(rowInserted?.i3).toEqual(4);
    expect(rowInserted?.i4).toEqual(null);
  });

  // hard_case
  test(`41 - Вставка записи в hard_case c cуществующим serial не должна состояться`, async () => {
    const record: ITestHardCaseRecord = {
      ser1: 1,
      i1: 5,
      i2: 5,
      i3: 5,
      i4: 5,
    };
    const rowInserted = await insertPg<ITestHardCaseRecord>({ connectionId, record, target: 'test.hard_case' });
    expect(rowInserted?.ser1).toEqual(1);
    expect(rowInserted?.i1).toEqual(1);
    expect(rowInserted?.i2).toEqual(1);
    expect(rowInserted?.i3).toEqual(2);
    expect(rowInserted?.i4).toEqual(2);
  });

  test(`42 - Вставка записи в hard_case c cуществующим serial не должна состояться. Вернется запись для первого сериала`, async () => {
    const record: ITestHardCaseRecord = {
      ser1: 1,
      ser2: 2,
      i1: 5,
      i2: 5,
      i3: 5,
      i4: 5,
    };
    const rowInserted = await insertPg<ITestHardCaseRecord>({ connectionId, record, target: 'test.hard_case' });
    expect(rowInserted?.ser1).toEqual(1);
    expect(rowInserted?.i1).toEqual(1);
    expect(rowInserted?.i2).toEqual(1);
    expect(rowInserted?.i3).toEqual(2);
    expect(rowInserted?.i4).toEqual(2);
  });

  test(`43 - Вставка записи в hard_case c cуществующим serial-2 не должна состояться.`, async () => {
    const record: ITestHardCaseRecord = {
      ser2: 2,
      i1: 5,
      i2: 5,
      i3: 5,
      i4: 5,
    };
    const rowInserted = await insertPg<ITestHardCaseRecord>({ connectionId, record, target: 'test.hard_case' });
    expect(rowInserted?.ser1).toEqual(2);
    expect(rowInserted?.i1).toEqual(2);
    expect(rowInserted?.i2).toEqual(2);
    expect(rowInserted?.i3).toEqual(3);
    expect(rowInserted?.i4).toEqual(3);
  });

  test(`44 - Вставка записи в hard_case c cуществующим pk не должна состояться.`, async () => {
    const record: ITestHardCaseRecord = {
      i1: 2,
      i2: 2,
      i3: 999,
      i4: 999,
      i5: 999,
      i6: 999,
    };
    const rowInserted = await insertPg<ITestHardCaseRecord>({ connectionId, record, target: 'test.hard_case' });
    expect(rowInserted?.ser1).toEqual(2);
    expect(rowInserted?.i1).toEqual(2);
    expect(rowInserted?.i2).toEqual(2);
    expect(rowInserted?.i3).toEqual(3);
    expect(rowInserted?.i4).toEqual(3);
  });

  test(`45 - Вставка записи в hard_case c cуществующим ux_i3_i4 не должна состояться.`, async () => {
    const record: ITestHardCaseRecord = {
      i1: 999,
      i2: 999,
      i3: 3,
      i4: 3,
      i5: 999,
      i6: 999,
    };
    const rowInserted = await insertPg<ITestHardCaseRecord>({ connectionId, record, target: 'test.hard_case' });
    expect(rowInserted?.ser1).toEqual(2);
    expect(rowInserted?.i1).toEqual(2);
    expect(rowInserted?.i2).toEqual(2);
    expect(rowInserted?.i3).toEqual(3);
    expect(rowInserted?.i4).toEqual(3);
  });

  test(`46 - Вставка записи в hard_case c cуществующим uix_i7_i8 не должна состояться.`, async () => {
    const record: ITestHardCaseRecord = {
      i1: 5,
      i2: 5,
      i3: 5,
      i4: 5,
      i5: 5,
      i6: 5,
      i7: 5,
      i8: 5,
    };
    const rowInserted = await insertPg<ITestHardCaseRecord>({ connectionId, record, target: 'test.hard_case' });
    expect(rowInserted?.ser1).toEqual(2);
    expect(rowInserted?.i1).toEqual(2);
    expect(rowInserted?.i2).toEqual(2);
    expect(rowInserted?.i3).toEqual(3);
    expect(rowInserted?.i4).toEqual(3);
  });

  test(`47 - Вставка новой записи в hard_case и возврат из view`, async () => {
    const record: ITestHardCaseRecord = {
      i1: 6,
      i2: 6,
      i3: 6,
      i4: 6,
      i5: 6,
      i6: 6,
      i7: 6,
      // i8: null,
    };
    const rowInserted = await insertPg<ITestHardCaseRecord>({ connectionId, record, target: 'test.hard_case', source: 'test.v_hard_case' });
    expect(rowInserted?.ser1).toEqual(3);
    expect(rowInserted?.ser2).toEqual(3);
    expect(rowInserted?.i1).toEqual(6);
    expect(rowInserted?.i2).toEqual(6);
    expect(rowInserted?.i3).toEqual(6);
    expect(rowInserted?.i4).toEqual(6);
    expect(rowInserted?.i7).toEqual(6);
    expect(rowInserted?.i8).toEqual(null);
  });
});
