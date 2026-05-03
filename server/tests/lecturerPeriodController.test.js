/**
 * Unit Tests - LecturerPeriodController
 * File: server/src/routes/internship-lecturers.js
 * Framework: Jest + Supertest
 *
 * Chức năng kiểm thử:
 *   - GET  /api/internship-lecturers/           : Lấy danh sách GVHD theo đợt
 *   - GET  /api/internship-lecturers/available  : Lấy GVHD còn slot hướng dẫn
 *   - POST /api/internship-lecturers/           : Tạo/cập nhật cấu hình GVHD (Admin)
 *   - PUT  /api/internship-lecturers/batch      : Cập nhật hàng loạt GVHD (Admin)
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db', () => ({ query: jest.fn() }));
const db = require('../src/config/db');

const lecturersRouter = require('../src/routes/internship-lecturers');

const app = express();
app.use(express.json());
app.use('/api/internship-lecturers', lecturersRouter);

const ADMIN_TOKEN   = jwt.sign({ id: 1, role: 'admin' },   'fit-secret');
const STUDENT_TOKEN = jwt.sign({ id: 2, role: 'student' }, 'fit-secret');

// ═══════════════════════════════════════════════════════════════════════════════
describe('LecturerPeriodController', () => {

  beforeEach(() => jest.clearAllMocks());

  // ─── GET / ──────────────────────────────────────────────────────────────────
  describe('GET / – Danh sách GVHD theo đợt', () => {

    test('TC-LP-001: Trả về 400 khi thiếu period_id', async () => {
      const res = await request(app).get('/api/internship-lecturers');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Thiếu period_id');
    });

    test('TC-LP-002: Trả về danh sách GVHD đầy đủ cho period_id hợp lệ', async () => {
      const mockLecturers = [
        { id: 1, name: 'GV Nguyễn Văn A', can_guide: 1, max_slots: 10, current_slots: 3, available_slots: 7 },
        { id: 2, name: 'GV Trần Thị B',   can_guide: 0, max_slots: 8,  current_slots: 0, available_slots: 8 },
      ];
      db.query.mockResolvedValueOnce([mockLecturers]);

      const res = await request(app).get('/api/internship-lecturers?period_id=1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].name).toBe('GV Nguyễn Văn A');
    });

    test('TC-LP-003: Lọc theo can_guide=true, chỉ trả về GVHD được phép hướng dẫn', async () => {
      const mockGuiding = [
        { id: 1, name: 'GV Nguyễn Văn A', can_guide: 1 },
      ];
      db.query.mockResolvedValueOnce([mockGuiding]);

      const res = await request(app).get('/api/internship-lecturers?period_id=1&can_guide=true');

      expect(res.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AND lp.can_guide = ?'),
        expect.arrayContaining([1])
      );
    });

    test('TC-LP-004: Lọc theo can_guide=false, chỉ trả về GVHD không hướng dẫn', async () => {
      const mockNotGuiding = [
        { id: 2, name: 'GV Trần Thị B', can_guide: 0 },
      ];
      db.query.mockResolvedValueOnce([mockNotGuiding]);

      const res = await request(app).get('/api/internship-lecturers?period_id=1&can_guide=false');

      expect(res.status).toBe(200);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AND lp.can_guide = ?'),
        expect.arrayContaining([0])
      );
    });

  });

  // ─── GET /available ──────────────────────────────────────────────────────────
  describe('GET /available – GVHD còn slot hướng dẫn', () => {

    test('TC-LP-005: Trả về 400 khi thiếu period_id', async () => {
      const res = await request(app).get('/api/internship-lecturers/available');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Thiếu period_id');
    });

    test('TC-LP-006: Trả về danh sách GVHD còn slot khi có dữ liệu', async () => {
      const mockAvailable = [
        { id: 1, name: 'GV Nguyễn Văn A', can_guide: 1, max_slots: 10, current_slots: 3, available_slots: 7 },
      ];
      db.query.mockResolvedValueOnce([mockAvailable]);

      const res = await request(app).get('/api/internship-lecturers/available?period_id=1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].available_slots).toBeGreaterThan(0);
    });

    test('TC-LP-007: Trả về mảng rỗng khi tất cả GVHD đã đầy slot', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/internship-lecturers/available?period_id=1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

  });

  // ─── POST / – Tạo/cập nhật cấu hình GVHD ───────────────────────────────────
  describe('POST / – Tạo/cập nhật cấu hình GVHD cho đợt (Admin)', () => {

    test('TC-LP-008: Trả về 401 khi không có token', async () => {
      const res = await request(app)
        .post('/api/internship-lecturers')
        .send({ period_id: 1, lecturer_id: 1, can_guide: true });

      expect(res.status).toBe(401);
    });

    test('TC-LP-009: Trả về 400 khi thiếu period_id', async () => {
      const res = await request(app)
        .post('/api/internship-lecturers')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ lecturer_id: 1, can_guide: true, max_slots: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Thiếu');
    });

    test('TC-LP-010: Trả về 400 khi thiếu lecturer_id', async () => {
      const res = await request(app)
        .post('/api/internship-lecturers')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ period_id: 1, can_guide: true, max_slots: 5 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Thiếu');
    });

    test('TC-LP-011: Tạo/cập nhật cấu hình GVHD thành công', async () => {
      db.query.mockResolvedValueOnce([{}]);

      const res = await request(app)
        .post('/api/internship-lecturers')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ period_id: 1, lecturer_id: 1, can_guide: true, max_slots: 5 });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
    });

    test('TC-LP-012: Dùng max_slots mặc định = 10 khi không truyền', async () => {
      db.query.mockResolvedValueOnce([{}]);

      await request(app)
        .post('/api/internship-lecturers')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ period_id: 1, lecturer_id: 2, can_guide: true });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO lecturer_periods'),
        expect.arrayContaining([10])
      );
    });

  });

  // ─── PUT /batch – Cập nhật hàng loạt GVHD ───────────────────────────────────
  describe('PUT /batch – Cập nhật hàng loạt GVHD (Admin)', () => {

    test('TC-LP-013: Trả về 400 khi thiếu period_id', async () => {
      const res = await request(app)
        .put('/api/internship-lecturers/batch')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ lecturers: [{ lecturer_id: 1, can_guide: true }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Thiếu period_id');
    });

    test('TC-LP-014: Trả về 400 khi lecturers không phải mảng', async () => {
      const res = await request(app)
        .put('/api/internship-lecturers/batch')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ period_id: 1, lecturers: 'not-an-array' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('không hợp lệ');
    });

    test('TC-LP-015: Cập nhật hàng loạt thành công với mảng GVHD hợp lệ', async () => {
      db.query
        .mockResolvedValueOnce([{}]) // START TRANSACTION
        .mockResolvedValueOnce([{}]) // INSERT lecturer 1
        .mockResolvedValueOnce([{}]) // INSERT lecturer 2
        .mockResolvedValueOnce([{}]); // COMMIT

      const res = await request(app)
        .put('/api/internship-lecturers/batch')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({
          period_id: 1,
          lecturers: [
            { lecturer_id: 1, can_guide: true,  max_slots: 10 },
            { lecturer_id: 2, can_guide: false, max_slots: 5  },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
      // Transaction phải COMMIT thành công
      expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

    test('TC-LP-016: Rollback transaction khi có lỗi trong batch update', async () => {
      db.query
        .mockResolvedValueOnce([{}])                       // START TRANSACTION
        .mockRejectedValueOnce(new Error('DB Error'))      // INSERT → lỗi
        .mockResolvedValueOnce([{}]);                      // ROLLBACK

      const res = await request(app)
        .put('/api/internship-lecturers/batch')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({
          period_id: 1,
          lecturers: [{ lecturer_id: 1, can_guide: true }],
        });

      expect(res.status).toBe(500);
      // ROLLBACK phải được gọi khi có lỗi giữa transaction
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
    });

  });

});
