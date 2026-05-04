/**
 * ============================================================
 * TEST SUITE: Pagination (crudFactory GET / with ?page&limit)
 * Test Cases: TC137 → TC138
 * File under test: src/utils/crudFactory.js (router.get '/'))
 * ============================================================
 *   - TC137: Phân trang hợp lệ (page=1, limit=5)   (Chuẩn)
 *   - TC138: Page vượt tổng số trang                (Ngoại lệ / Boundary)
 * ============================================================
 */

const request = require('supertest');
const {
  pool,
  ADMIN_TOKEN,
  createCrudApp,
  rollbackTable,
} = require('../setup');

const paginationApp = createCrudApp('/api/news', {
  tableName: 'news',
  searchableFields: ['title', 'summary', 'content'],
  nullableFields: ['published_at', 'summary', 'image_url'],
  dateFields: ['published_at'],
});

/* ---- Seed: tạo 10 bản ghi news để test phân trang ---- */
beforeAll(async () => {
  const seedPromises = [];
  for (let i = 1; i <= 10; i++) {
    seedPromises.push(
      pool.query('INSERT INTO news (title, content) VALUES (?, ?)', [
        `Pagination News ${i}`,
        `Content ${i}`,
      ])
    );
  }
  await Promise.all(seedPromises);
});

/* ---- Rollback ---- */
afterAll(async () => {
  await rollbackTable('news');
});

/* ============================================================
 * TC137 – Phân trang hợp lệ
 * Loại: Chuẩn | CheckDB: N | Rollback: N
 * Input:  GET /api/news?page=1&limit=5
 * Expect: HTTP 200, data array ≤ 5 items, pagination object
 * ============================================================ */
describe('TC137 – pagination: page=1, limit=5', () => {
  it('should return paginated response with data and pagination info', async () => {
    const response = await request(paginationApp)
      .get('/api/news?page=1&limit=5');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.data.length).toBeLessThanOrEqual(5);
    expect(response.body.pagination).toHaveProperty('totalPages');
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(5);
  });
});

/* ============================================================
 * TC138 – Page vượt tổng số trang (boundary)
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * Input:  GET /api/news?page=999&limit=5
 * Expect: HTTP 200, data = [] (mảng rỗng)
 * ============================================================ */
describe('TC138 – pagination: page vượt tổng (boundary)', () => {
  it('should return 200 with empty data array', async () => {
    const response = await request(paginationApp)
      .get('/api/news?page=999&limit=5');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
});
