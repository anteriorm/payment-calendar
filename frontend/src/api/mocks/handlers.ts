/**
 * Вспомогательные утилиты для мок-функций.
 *
 * delay()   — имитирует задержку сети, чтобы интерфейс показывал спиннеры
 * randomId() — генерирует ID для новых объектов (как будто бэкенд вернул)
 * mockError() — имитирует ошибку API (для тестирования error states)
 */

export function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), ms));
}

export function randomId(): number {
  return Math.floor(Math.random() * 90000) + 10000;
}

export function mockError(message: string, status = 500): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject({ response: { status, data: { message } } }), 300),
  );
}
