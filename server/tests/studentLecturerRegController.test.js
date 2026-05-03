/**
 * Unit Tests - StudentLecturerRegController
 * File: server/src/routes/internship-registrations.js (phần POST /lecturer)
 * Framework: Jest + Supertest
 *
 * Chức năng kiểm thử:
 *   - GET  /api/internship-registrations/my-lecturer         : Lấy đăng ký GVHD của SV
 *   - POST /api/internship-registrations/lecturer            : Đăng ký GVHD (ĐK mới + Đổi GVHD)
 *   - PUT  /api/internship-registrations/lecturer/:id/status : Admin cập nhật trạng thái
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/db', () => ({ query: jest.fn() }));
const db = require('../src/config/db');

const registrationsRouter = require('../src/routes/internship-registrations');

const app = express();
app.use(express.json());
app.use('/api/internship-registrations', registrationsRouter);

const STUDENT_TOKEN = jwt.sign({ id: 2, role: 'student' }, 'fit-secret');
const ADMIN_TOKEN   = jwt.sign({ id: 1, role: 'admin' },   'fit-secret');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const NOW = new Date();
const makeActivePeriod = () => ({
  id: 1,
  name: 'Đợt TT 2025',
  is_active: true,
  start_date: new Date(NOW.getTime() - 10 * 86400000).toISOString(),
  end_date:   new Date(NOW.getTime() + 10 * 86400000).toISOString(),
});

const ACTIVE_PERIOD = makeActivePeriod();

// ═══════════════════════════════════════════════════════════════════════════════
describe('StudentLecturerRegController', () => {

  beforeEach(() => jest.clearAllMocks());

  // ─── GET /my-lecturer ────────────────────────────────────────────────────────
  describe('GET /my-lecturer – Đăng ký GVHD của sinh viên', () => {

    test('TC-SLR-001: Trả về 401 khi không có token', async () => {
      const res = await request(app).get('/api/internship-registrations/my-lecturer');

      expect(res.status).toBe(401);
    });

    test('TC-SLR-002: Trả về danh sách đăng ký GVHD của sinh viên hiện tại', async () => {
      const mockRegs = [
        { id: 1, student_id: 2, lecturer_name: 'GV Nguyễn A', period_name: 'Đợt TT 2025', status: 'approved' },
      ];
      db.query.mockResolvedValueOnce([mockRegs]);

      const res = await request(app)
        .get('/api/internship-registrations/my-lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('approved');
    });

    test('TC-SLR-003: Trả về mảng rỗng khi SV chưa đăng ký GVHD', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/api/internship-registrations/my-lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

  });

  // ─── POST /lecturer – Đăng ký GVHD ─────────────────────────────────────────
  describe('POST /lecturer – Đăng ký giảng viên hướng dẫn', () => {

    test('TC-SLR-004: Trả về 401 khi không có token', async () => {
      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .send({ period_id: 1, lecturer_id: 1 });

      expect(res.status).toBe(401);
    });

    test('TC-SLR-005: Trả về 400 khi thiếu period_id', async () => {
      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ lecturer_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Thiếu period_id');
    });

    test('TC-SLR-006: Trả về 400 khi thiếu lecturer_id', async () => {
      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Thiếu period_id');
    });

    test('TC-SLR-007: Trả về 400 khi đợt không tồn tại hoặc không active', async () => {
      db.query.mockResolvedValueOnce([[]]); // không tìm thấy period active

      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 99, lecturer_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('không đang hoạt động');
    });

    test('TC-SLR-008: Trả về 400 khi hiện tại ngoài thời gian đăng ký của đợt', async () => {
      const expiredPeriod = {
        id: 1,
        is_active: true,
        start_date: new Date('2020-01-01').toISOString(),
        end_date:   new Date('2020-02-28').toISOString(),
      };
      db.query.mockResolvedValueOnce([[expiredPeriod]]);

      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, lecturer_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Không trong thời gian đăng ký');
    });

    test('TC-SLR-009: Trả về 400 khi GVHD không được phép hướng dẫn trong đợt này', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 5, can_guide: false, max_slots: 10, current_slots: 0 }]]);

      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, lecturer_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('không thể hướng dẫn');
    });

    test('TC-SLR-010: Trả về 400 khi GVHD đã hết slot nhận sinh viên', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 5, can_guide: true, max_slots: 10, current_slots: 10 }]]);

      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, lecturer_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('hết slot');
    });

    test('TC-SLR-011: Trả về 400 khi sinh viên đăng ký lại cùng giảng viên đã đăng ký', async () => {
      const LECTURER_PERIOD_ID = 5;
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: LECTURER_PERIOD_ID, can_guide: true, max_slots: 10, current_slots: 3 }]])
        .mockResolvedValueOnce([[{ id: 1, lecturer_period_id: LECTURER_PERIOD_ID }]]); // đã đăng ký cùng GV

      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, lecturer_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('đã đăng ký giảng viên này rồi');
    });

    test('TC-SLR-012: Đăng ký GVHD MỚI thành công – trả về 201', async () => {
      // Trình tự: period → lecturer_period → existing(trống) → transaction
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 5, can_guide: true, max_slots: 10, current_slots: 3 }]])
        .mockResolvedValueOnce([[]])   // chưa có đăng ký cũ
        .mockResolvedValueOnce([{}])   // START TRANSACTION
        .mockResolvedValueOnce([{}])   // INSERT registration
        .mockResolvedValueOnce([{}])   // UPDATE lecturer_periods (tăng slot)
        .mockResolvedValueOnce([{}]);  // COMMIT

      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, lecturer_id: 1 });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('Đăng ký giảng viên thành công');
      // Transaction phải kết thúc bằng COMMIT
      expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

    test('TC-SLR-017: Đổi GVHD – DB lỗi giữa transaction → ROLLBACK', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 7, can_guide: true, max_slots: 10, current_slots: 2 }]])
        .mockResolvedValueOnce([[{ id: 10, lecturer_period_id: 5 }]])  // đã đăng ký GV cũ
        .mockResolvedValueOnce([{}])                                    // START TRANSACTION
        .mockRejectedValueOnce(new Error('DB Error'))                   // UPDATE registration → lỗi
        .mockResolvedValueOnce([{}]);                                   // ROLLBACK

      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, lecturer_id: 2 });

      expect(res.status).toBe(500);
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('TC-SLR-013: ĐỔI GVHD sang giảng viên khác thành công – trả về 200', async () => {
      const OLD_LP_ID = 5;
      const NEW_LP_ID = 7;

      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: NEW_LP_ID, can_guide: true, max_slots: 10, current_slots: 2 }]])
        .mockResolvedValueOnce([[{ id: 10, lecturer_period_id: OLD_LP_ID }]])  // đã đăng ký GV cũ
        .mockResolvedValueOnce([{}])   // START TRANSACTION
        .mockResolvedValueOnce([{}])   // UPDATE registration (đổi sang GV mới)
        .mockResolvedValueOnce([{}])   // GREATEST(0, current_slots - 1) cho GV cũ
        .mockResolvedValueOnce([{}])   // current_slots + 1 cho GV mới
        .mockResolvedValueOnce([{}]);  // COMMIT

      const res = await request(app)
        .post('/api/internship-registrations/lecturer')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, lecturer_id: 2 }); // lecturer_id khác → new LP id = 7

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Thay đổi giảng viên thành công');
      // Transaction phải kết thúc bằng COMMIT (slot GV cũ giảm, slot GV mới tăng)
      expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

  });

  // ─── PUT /lecturer/:id/status – Admin cập nhật trạng thái ──────────────────
  describe('PUT /lecturer/:id/status – Admin cập nhật trạng thái đăng ký GVHD', () => {

    test('TC-SLR-014: Trả về 400 khi status không hợp lệ', async () => {
      const res = await request(app)
        .put('/api/internship-registrations/lecturer/1/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Trạng thái không hợp lệ');
    });

    test('TC-SLR-015: Cập nhật trạng thái approved thành công', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .put('/api/internship-registrations/lecturer/1/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'approved', notes: 'Duyệt' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
    });

    test('TC-SLR-016: Cập nhật trạng thái rejected thành công', async () => {
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .put('/api/internship-registrations/lecturer/1/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'rejected', notes: 'Từ chối' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
    });

  });

});
