/**
 * ============================================================
 * TEST SUITE: News Module (crudFactory – table: news)
 * Test Cases: TC101 → TC106
 * File under test: src/utils/crudFactory.js
 * Route config:    /api/news (server.js)
 * ============================================================
 * Mô tả: Kiểm thử CRUD và tìm kiếm tin tức.
 *   - TC101: Tạo tin tức hợp lệ              (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC102: Tạo tin tức thiếu title          (Ngoại lệ)
 *   - TC103: Cập nhật tin tức                 (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC104: Xóa tin tức                      (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC105: Lấy danh sách tin tức (public)   (Chuẩn)
 *   - TC106: Tìm kiếm tin tức theo từ khóa   (Chuẩn)
 * ============================================================
 */

const request = require('supertest');
const {
  pool,
  ADMIN_TOKEN,
  createCrudApp,
  rollbackTable,
} = require('../setup');

/* ---- Tạo Express app giống cấu hình trong server.js ---- */
const newsApp = createCrudApp('/api/news', {
  tableName: 'news',
  searchableFields: ['title', 'summary', 'content'],
  nullableFields: ['published_at', 'summary', 'image_url'],
  dateFields: ['published_at'],
});

/* ---- Biến lưu id bản ghi tạo bởi test (dùng cho CheckDB & Rollback) ---- */
let createdNewsId;

/* ---- Rollback: đảm bảo DB trở về trạng thái trước test ---- */
afterAll(async () => {
  await rollbackTable('news');
});

/* ============================================================
 * TC101 – Tạo tin tức hợp lệ
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * Input:  title, summary, content, image_url (đầy đủ)
 * Expect: HTTP 201, bản ghi mới trong DB
 * ============================================================ */
describe('TC101 – createNews: tạo tin tức hợp lệ', () => {
  it('should return 201 and persist news to database', async () => {
    /* --- Execute: gửi POST tạo tin tức --- */
    const validNewsPayload = {
      title: 'Tin tức kiểm thử TC101',
      summary: 'Tóm tắt tin tức',
      content: 'Nội dung chi tiết tin tức',
      image_url: 'https://example.com/img.jpg',
    };

    const response = await request(newsApp)
      .post('/api/news')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validNewsPayload);

    /* --- Verify: HTTP status & response body --- */
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(validNewsPayload.title);

    /* --- Lưu id để dùng cho các TC tiếp theo & rollback --- */
    createdNewsId = response.body.id;

    /* --- CheckDB: xác nhận bản ghi tồn tại trong DB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM news WHERE id = ?',
      [createdNewsId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].title).toBe(validNewsPayload.title);
    expect(dbRows[0].summary).toBe(validNewsPayload.summary);
  });
});

/* ============================================================
 * TC102 – Tạo tin tức thiếu title (required field – NOT NULL in DB)
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * Input:  body thiếu title
 * Expect: HTTP 500 (ER_NO_DEFAULT_FOR_FIELD – MySQL strict mode)
 *         errorHandler trả về { success: false, message: ... }
 * ============================================================ */
describe('TC102 – createNews: thiếu title', () => {
  it('should reject when title is missing (NOT NULL constraint)', async () => {
    const missingTitlePayload = { summary: 'Chỉ có tóm tắt' };

    const response = await request(newsApp)
      .post('/api/news')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingTitlePayload);

    /* MySQL strict mode: ER_NO_DEFAULT_FOR_FIELD → 500 */
    expect(response.status).toBe(500);
  });
});

/* ============================================================
 * TC103 – Cập nhật tin tức
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * Input:  id hợp lệ, title mới
 * Expect: HTTP 200, DB cập nhật title
 * ============================================================ */
describe('TC103 – updateNews: cập nhật tin tức', () => {
  it('should return 200 and update title in database', async () => {
    const updatedTitle = 'Tiêu đề đã cập nhật TC103';

    const response = await request(newsApp)
      .put(`/api/news/${createdNewsId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ title: updatedTitle });

    /* --- Verify response --- */
    expect(response.status).toBe(200);
    expect(response.body.title).toBe(updatedTitle);

    /* --- CheckDB: xác nhận DB đã cập nhật --- */
    const [dbRows] = await pool.query(
      'SELECT title FROM news WHERE id = ?',
      [createdNewsId]
    );
    expect(dbRows[0].title).toBe(updatedTitle);
  });
});

/* ============================================================
 * TC104 – Xóa tin tức
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * Input:  id hợp lệ
 * Expect: HTTP 200, bản ghi bị xóa khỏi DB
 * ============================================================ */
describe('TC104 – deleteNews: xóa tin tức', () => {
  it('should return 200 and remove news from database', async () => {
    const response = await request(newsApp)
      .delete(`/api/news/${createdNewsId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Xóa thành công');

    /* --- CheckDB: xác nhận bản ghi đã bị xóa --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM news WHERE id = ?',
      [createdNewsId]
    );
    expect(dbRows).toHaveLength(0);
  });
});

/* ============================================================
 * TC105 – Lấy danh sách tin tức (public, không cần auth)
 * Loại: Chuẩn | CheckDB: N | Rollback: N
 * Input:  GET /api/news (không có Authorization header)
 * Expect: HTTP 200, trả về array
 * ============================================================ */
describe('TC105 – getNewsList: lấy danh sách tin tức công khai', () => {
  it('should return 200 and an array without auth', async () => {
    const response = await request(newsApp).get('/api/news');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

/* ============================================================
 * TC106 – Tìm kiếm tin tức theo từ khóa
 * Loại: Chuẩn | CheckDB: N | Rollback: N
 * Input:  ?q=CNTT
 * Expect: HTTP 200, kết quả lọc theo searchableFields
 * ============================================================ */
describe('TC106 – searchNews: tìm kiếm tin tức', () => {
  /* Seed 1 bản ghi chứa từ khóa để đảm bảo có kết quả */
  let seedNewsId;

  beforeAll(async () => {
    const res = await request(newsApp)
      .post('/api/news')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ title: 'Tin CNTT mới nhất', content: 'Nội dung CNTT' });
    seedNewsId = res.body.id;
  });

  it('should return 200 with filtered results matching keyword', async () => {
    const response = await request(newsApp).get('/api/news?q=CNTT');

    expect(response.status).toBe(200);
    /* Kết quả phải chứa ít nhất bản ghi vừa seed */
    const results = Array.isArray(response.body) ? response.body : response.body.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
