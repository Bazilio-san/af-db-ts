/**
 * Тест проверяет, что при использовании registerTypesFunctions не возникает
 * DeprecationWarning "Calling client.query() when the client is already executing a query".
 *
 * Проблема: ранее registerTypesFunctions вызывались в async-обработчике события 'connect' пула.
 * pg-pool эмитит 'connect' синхронно и сразу отдаёт клиент потребителю,
 * что приводило к гонке между registerTypesFunctions и пользовательскими запросами.
 * В pg >= 8.19 это генерирует DeprecationWarning.
 *
 * Решение: registerTypesFunctions передаются через опцию verify пула,
 * которая вызывается ПЕРЕД тем как клиент отдаётся потребителю.
 */
import { PoolClient } from 'pg';
import { getPoolPg, closePoolPg, poolsCachePg } from '../../../src';

const connectionId = 'test';

// Фиктивная registerTypeFunction, имитирующая pgvector.registerType —
// выполняет запрос на клиенте (именно это вызывало гонку)
const fakeRegisterType = async (client: PoolClient): Promise<void> => {
  await client.query('SELECT 1');
};

afterEach(async () => {
  // Очищаем кеш пулов, чтобы каждый тест начинал с чистого состояния
  const pool = poolsCachePg[connectionId];
  if (pool) {
    await pool.end();
    delete poolsCachePg[connectionId];
  }
});

describe('Pool: no deprecation warning with registerTypesFunctions', () => {
  test('queryPg с registerTypesFunctions не генерирует DeprecationWarning', async () => {
    const warnings: string[] = [];
    const warningHandler = (warning: Error) => {
      warnings.push(warning.message);
    };
    process.on('warning', warningHandler);

    try {
      // Получаем пул с registerTypesFunctions
      const pool = await getPoolPg({
        connectionId,
        registerTypesFunctions: [fakeRegisterType],
      });

      // Выполняем несколько запросов подряд, чтобы спровоцировать гонку
      // (если бы registerTypesFunctions были в connect-обработчике)
      const results = await Promise.all([
        pool.query('SELECT 1 AS val'),
        pool.query('SELECT 2 AS val'),
        pool.query('SELECT 3 AS val'),
      ]);

      expect(results[0].rows[0].val).toEqual(1);
      expect(results[1].rows[0].val).toEqual(2);
      expect(results[2].rows[0].val).toEqual(3);

      // Даём время на обработку возможных warning'ов (они асинхронны)
      await new Promise((resolve) => { setTimeout(resolve, 200); });

      const deprecationWarnings = warnings.filter((msg) => msg.includes('already executing a query'));
      expect(deprecationWarnings).toEqual([]);
    } finally {
      process.removeListener('warning', warningHandler);
    }
  });

  test('getPoolPg возвращает работающий пул и корректно закрывается', async () => {
    const pool = await getPoolPg({
      connectionId,
      registerTypesFunctions: [fakeRegisterType],
    });

    const res = await pool.query('SELECT current_database() AS db');
    expect(res.rows[0].db).toBeTruthy();

    const closed = await closePoolPg(connectionId);
    expect(closed).toBe(true);
  });
});
