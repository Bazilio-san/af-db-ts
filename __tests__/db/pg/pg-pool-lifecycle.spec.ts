import { Pool } from 'pg';
import { closeAllPgConnectionsPg, closePoolPg, getDbConfigPg, getPoolPg } from '../../../src/pg/pool-pg';

jest.mock('config', () => ({
  util: { toObject: () => ({ db: { postgres: { dbs: { first: { host: 'first' }, second: { database: 'second' } } } } }) },
}));

jest.mock('pg', () => ({ Pool: jest.fn() }));

const makePool = () => ({
  on: jest.fn(),
  connect: jest.fn(async () => ({ release: jest.fn() })),
  end: jest.fn(async () => {}),
});

afterEach(async () => {
  await closeAllPgConnectionsPg();
  jest.clearAllMocks();
});

test('named databases use independent configuration objects', () => {
  const first = getDbConfigPg('first', true);
  const second = getDbConfigPg('second', true);
  expect(second).not.toHaveProperty('host');
  expect(first).not.toHaveProperty('database');
});

test('concurrent callers share a pool and reopening waits for shutdown', async () => {
  let finish!: () => void;
  const first = makePool();
  first.end.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
  const second = makePool();
  (Pool as unknown as jest.Mock).mockReturnValueOnce(first).mockReturnValueOnce(second);
  const opened = await Promise.all([getPoolPg('first'), getPoolPg('first')]);
  expect(opened[0]).toBe(opened[1]);
  const closing = Promise.all([closePoolPg('first'), closePoolPg('first')]);
  const reopening = getPoolPg('first');
  expect(first.end).toHaveBeenCalledTimes(1);
  expect(Pool).toHaveBeenCalledTimes(1);
  finish();
  await closing;
  expect(await reopening).toBe(second);
});

test('a failed first connection is closed and a retry creates a fresh pool', async () => {
  const first = makePool();
  first.connect.mockRejectedValueOnce(new Error('offline'));
  const second = makePool();
  (Pool as unknown as jest.Mock).mockReturnValueOnce(first).mockReturnValueOnce(second);
  await expect(getPoolPg('first')).rejects.toThrow('offline');
  expect(first.end).toHaveBeenCalledTimes(1);
  expect(await getPoolPg('first')).toBe(second);
});
