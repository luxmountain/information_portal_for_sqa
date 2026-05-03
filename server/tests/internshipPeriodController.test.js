/**
 * Unit Tests - InternshipPeriodController
 * File: server/src/routes/internship-periods.js
 * Framework: Jest + Supertest
 *
 * Chức năng kiểm thử:
 *   - GET  /api/internship-periods/          : Lấy danh sách đợt TT
 *   - GET  /api/internship-periods/active    : Lấy đợt đang hoạt động
 *   - GET  /api/internship-periods/:id       : Lấy chi tiết đợt
 *   - POST /api/internship-periods/          : Tạo đợt TT mới (Admin)
 *   - PUT  /api/internship-periods/:id       : Cập nhật đợt TT (Admin)
 *   - DELETE /api/internship-periods/:id     : Xóa đợt TT (Admin)
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db', () => ({ query: jest.fn() }));
const db = require('../src/config/db');

const periodsRouter = require('../src/routes/internship-periods');

const app = express();
app.use(express.json());
app.use('/api/internship-periods', periodsRouter);

const ADMIN_TOKEN   = jwt.sign({ id: 1, role: 'admin' },   'fit-secret');
const STUDENT_TOKEN = jwt.sign({ id: 2, role: 'student' }, 'fit-secret');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date();
const pastStr   = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const futureStr = new Date(NOW.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

// ═══════════════════════════════════════════════════════════════════════════════
describe('InternshipPeriodController', () => {

  beforeEach(() => jest.clearAllMocks());

  // ─── GET / ──────────────────────────────────────────────────────────────────
  describe('GET / – Danh sách đợt đăng ký', () => {

    test('TC-IP-001: Trả về mảng đợt TT khi tồn tại dữ liệu', async () => {
      const mockPeriods = [
        { id: 1, name: 'Đợt TT HK1 2024', start_date: '2024-01-01', end_date: '2024-02-28', is_active: true },
        { id: 2, name: 'Đợt TT HK2 2024', start_date: '2024-07-01', end_date: '2024-08-31', is_active: false },
      ];
      db.query.mockResolvedValueOnce([mockPeriods]);

      const res = await request(app).get('/api/internship-periods');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('Đợt TT HK1 2024');
    });

    test('TC-IP-002: Trả về mảng rỗng khi không có đợt nào', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/internship-periods');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

  });

  // ─── GET /active ────────────────────────────────────────────────────────────
  describe('GET /active – Đợt đang hoạt động', () => {

    test('TC-IP-003: Trả về đợt active khi tồn tại', async () => {
      const mockPeriod = { id: 1, name: 'Đợt TT 2024', is_active: true, start_date: '2024-01-01', end_date: '2024-02-28' };
      db.query.mockResolvedValueOnce([[mockPeriod]]);

      const res = await request(app).get('/api/internship-periods/active');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.is_active).toBe(true);
    });

    test('TC-IP-004: Trả về 404 khi không có đợt nào active', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/internship-periods/active');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('Không có đợt');
    });

  });

  // ─── GET /:id ────────────────────────────────────────────────────────────────
  describe('GET /:id – Chi tiết đợt đăng ký', () => {

    test('TC-IP-005: Trả về đợt TT khi ID tồn tại', async () => {
      const mockPeriod = { id: 1, name: 'Đợt TT 2024', start_date: '2024-01-01', end_date: '2024-02-28' };
      db.query.mockResolvedValueOnce([[mockPeriod]]);

      const res = await request(app).get('/api/internship-periods/1');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(1);
      expect(res.body.name).toBe('Đợt TT 2024');
    });

    test('TC-IP-006: Trả về 404 khi ID không tồn tại', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/internship-periods/999');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Không tìm thấy');
    });

  });

  // ─── POST / – Tạo đợt TT mới ────────────────────────────────────────────────
  describe('POST / – Tạo đợt TT mới (Admin)', () => {

    const validPayload = {
      name: 'Đợt TT HK1 2025',
      start_date: pastStr,
      end_date: futureStr,
      description: 'Mô tả đợt thực tập',
    };

    test('TC-IP-007: Trả về 401 khi không có token xác thực', async () => {
      const res = await request(app).post('/api/internship-periods').send(validPayload);

      expect(res.status).toBe(401);
    });

    test('TC-IP-008: Trả về 403 khi token không phải admin', async () => {
      const res = await request(app)
        .post('/api/internship-periods')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(403);
    });

    test('TC-IP-009: Trả về 400 khi end_date trước start_date', async () => {
      const res = await request(app)
        .post('/api/internship-periods')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ name: 'Test', start_date: '2025-03-01', end_date: '2025-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('sau thời gian bắt đầu');
    });

    test('TC-IP-010: Trả về 400 khi end_date bằng start_date', async () => {
      const res = await request(app)
        .post('/api/internship-periods')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ name: 'Test', start_date: '2025-01-01', end_date: '2025-01-01' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('sau thời gian bắt đầu');
    });

    test('TC-IP-011: Trả về 400 khi định dạng ngày không hợp lệ', async () => {
      const res = await request(app)
        .post('/api/internship-periods')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ name: 'Test', start_date: 'not-a-date', end_date: '2025-02-28' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('không hợp lệ');
    });

    test('TC-IP-012: Trả về 400 khi thời gian trùng với đợt đang tồn tại', async () => {
      db.query.mockResolvedValueOnce([[{
        id: 2, name: 'Đợt TT cũ',
        start_date: '2025-01-10',
        end_date: '2025-03-10',
      }]]);

      const res = await request(app)
        .post('/api/internship-periods')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Không thể tạo');
      expect(res.body.error).toContain('Đợt TT cũ');
    });

    test('TC-IP-013: Tạo đợt TT thành công với dữ liệu hợp lệ (is_active=false)', async () => {
      db.query
        .mockResolvedValueOnce([[]])               // overlap check → trống
        .mockResolvedValueOnce([{ insertId: 10 }]) // INSERT period
        .mockResolvedValueOnce([{}]);              // INSERT academy enterprise

      const res = await request(app)
        .post('/api/internship-periods')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(10);
      expect(res.body.message).toContain('thành công');
    });

    test('TC-IP-014: Tạo đợt với is_active=true sẽ tắt tất cả đợt khác', async () => {
      db.query
        .mockResolvedValueOnce([[]])                // overlap check
        .mockResolvedValueOnce([{}])                // UPDATE others inactive
        .mockResolvedValueOnce([{ insertId: 11 }])  // INSERT period
        .mockResolvedValueOnce([{}]);               // INSERT academy enterprise

      const res = await request(app)
        .post('/api/internship-periods')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ ...validPayload, is_active: true });

      expect(res.status).toBe(201);
      expect(db.query).toHaveBeenCalledWith('UPDATE internship_periods SET is_active = FALSE');
    });

  });

  // ─── PUT /:id – Cập nhật đợt TT ─────────────────────────────────────────────
  describe('PUT /:id – Cập nhật đợt TT (Admin)', () => {

    const updatePayload = {
      name: 'Đợt TT Updated',
      start_date: '2025-06-01',
      end_date: '2025-07-31',
    };

    test('TC-IP-015: Trả về 400 khi end_date <= start_date khi cập nhật', async () => {
      const res = await request(app)
        .put('/api/internship-periods/1')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ name: 'Test', start_date: '2025-06-01', end_date: '2025-05-01' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('sau thời gian bắt đầu');
    });

    test('TC-IP-016: Trả về 400 khi thời gian trùng với đợt KHÁC (không tính đợt hiện tại)', async () => {
      db.query.mockResolvedValueOnce([[{ id: 3, name: 'Đợt TT khác', start_date: '2025-06-15', end_date: '2025-08-01' }]]);

      const res = await request(app)
        .put('/api/internship-periods/1')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(updatePayload);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Không thể cập nhật');
    });

    test('TC-IP-017: Cập nhật đợt TT thành công', async () => {
      db.query
        .mockResolvedValueOnce([[]])  // no overlap
        .mockResolvedValueOnce([{}]); // UPDATE

      const res = await request(app)
        .put('/api/internship-periods/1')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
    });

    test('TC-IP-021: Cập nhật đợt TT với is_active=true sẽ tắt tất cả đợt khác', async () => {
      db.query
        .mockResolvedValueOnce([[]])   // no overlap
        .mockResolvedValueOnce([{}])   // UPDATE others inactive WHERE id != ?
        .mockResolvedValueOnce([{}]);  // UPDATE this period

      const res = await request(app)
        .put('/api/internship-periods/1')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ ...updatePayload, is_active: true });

      expect(res.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE internship_periods SET is_active = FALSE WHERE id != ?',
        ['1']
      );
    });

  });

  // ─── DELETE /:id – Xóa đợt TT ───────────────────────────────────────────────
  describe('DELETE /:id – Xóa đợt TT (Admin)', () => {

    test('TC-IP-018: Trả về 401 khi không có token khi xóa', async () => {
      const res = await request(app).delete('/api/internship-periods/1');

      expect(res.status).toBe(401);
    });

    test('TC-IP-019: Xóa đợt TT thành công khi là admin', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .delete('/api/internship-periods/1')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
    });

    test('TC-IP-020: Trả về 403 khi student cố xóa đợt', async () => {
      const res = await request(app)
        .delete('/api/internship-periods/1')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

      expect(res.status).toBe(403);
    });

  });

});
