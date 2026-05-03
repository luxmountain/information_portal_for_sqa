/**
 * Unit Tests - StudentEnterpriseRegController
 * File: server/src/routes/internship-registrations.js (phần POST /preferences)
 * Framework: Jest + Supertest
 *
 * Chức năng kiểm thử:
 *   - GET  /api/internship-registrations/my-preferences          : Lấy nguyện vọng của SV
 *   - POST /api/internship-registrations/preferences             : ĐK nguyện vọng DN TT
 *   - PUT  /api/internship-registrations/preference/:id/status   : Admin duyệt/từ chối
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
const ACTIVE_PERIOD = {
  id: 1,
  name: 'Đợt TT 2025',
  is_active: true,
  start_date: new Date(NOW.getTime() - 10 * 86400000).toISOString(),
  end_date:   new Date(NOW.getTime() + 10 * 86400000).toISOString(),
};

const makeEnterprise = (id, slotsUsed = 0, maxSlots = 10) => ({
  id,
  name: `Công ty ${id}`,
  period_id: 1,
  is_active: true,
  max_slots: maxSlots,
  current_slots: slotsUsed,
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('StudentEnterpriseRegController', () => {

  beforeEach(() => jest.clearAllMocks());

  // ─── GET /my-preferences ─────────────────────────────────────────────────────
  describe('GET /my-preferences – Nguyện vọng DN của sinh viên', () => {

    test('TC-SER-001: Trả về 401 khi không có token', async () => {
      const res = await request(app).get('/api/internship-registrations/my-preferences');

      expect(res.status).toBe(401);
    });

    test('TC-SER-002: Trả về danh sách nguyện vọng đã đăng ký của SV', async () => {
      const mockPrefs = [
        { id: 1, student_id: 2, enterprise_name: 'Công ty ABC', preference_order: 1, status: 'pending' },
        { id: 2, student_id: 2, enterprise_name: 'Công ty XYZ', preference_order: 2, status: 'pending' },
      ];
      db.query.mockResolvedValueOnce([mockPrefs]);

      const res = await request(app)
        .get('/api/internship-registrations/my-preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].preference_order).toBe(1);
    });

    test('TC-SER-003: Trả về mảng rỗng khi SV chưa có nguyện vọng', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const res = await request(app)
        .get('/api/internship-registrations/my-preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

  });

  // ─── POST /preferences – Đăng ký nguyện vọng ─────────────────────────────────
  describe('POST /preferences – Đăng ký nguyện vọng DN thực tập', () => {

    test('TC-SER-004: Trả về 401 khi không có token', async () => {
      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .send({ period_id: 1, preferences: [{ enterprise_id: 1, preference_order: 1 }] });

      expect(res.status).toBe(401);
    });

    test('TC-SER-005: Trả về 400 khi thiếu period_id', async () => {
      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ preferences: [{ enterprise_id: 1, preference_order: 1 }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('không hợp lệ');
    });

    test('TC-SER-006: Trả về 400 khi preferences là mảng rỗng', async () => {
      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, preferences: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('không hợp lệ');
    });

    test('TC-SER-007: Trả về 400 khi đăng ký hơn 5 nguyện vọng (tối đa 5)', async () => {
      const sixPrefs = [1, 2, 3, 4, 5, 6].map(i => ({ enterprise_id: i, preference_order: i }));

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, preferences: sixPrefs });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('tối đa 5');
    });

    test('TC-SER-008: Trả về 400 khi đợt không active hoặc không tồn tại', async () => {
      db.query.mockResolvedValueOnce([[]]); // không có period active

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 99, preferences: [{ enterprise_id: 1, preference_order: 1 }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('không đang hoạt động');
    });

    test('TC-SER-009: Trả về 400 khi hiện tại ngoài thời gian đăng ký', async () => {
      const expiredPeriod = {
        id: 1, is_active: true,
        start_date: new Date('2020-01-01').toISOString(),
        end_date:   new Date('2020-02-28').toISOString(),
      };
      db.query.mockResolvedValueOnce([[expiredPeriod]]);

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, preferences: [{ enterprise_id: 1, preference_order: 1 }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Không trong thời gian');
    });

    test('TC-SER-010: Trả về 400 khi SV chưa đăng ký GVHD', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[]]); // chưa có đăng ký GVHD

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, preferences: [{ enterprise_id: 1, preference_order: 1 }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('phải đăng ký giảng viên');
    });

    test('TC-SER-011: Trả về 400 khi SV đã đăng ký nguyện vọng trong đợt này rồi', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 1 }]])             // có GVHD
        .mockResolvedValueOnce([[{ id: 5, preference_order: 1 }]]); // đã có nguyện vọng

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, preferences: [{ enterprise_id: 1, preference_order: 1 }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('đã đăng ký nguyện vọng');
    });

    test('TC-SER-012: Trả về 400 khi thứ tự nguyện vọng không tuần tự (1, 3 thay vì 1, 2)', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[]]); // chưa có nguyện vọng

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({
          period_id: 1,
          preferences: [
            { enterprise_id: 1, preference_order: 1 },
            { enterprise_id: 2, preference_order: 3 }, // bỏ qua thứ tự 2
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Thứ tự nguyện vọng');
    });

    test('TC-SER-013: Trả về lỗi khi DN không tồn tại hoặc không active trong đợt', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[]])   // chưa có nguyện vọng
        .mockResolvedValueOnce([{}])   // START TRANSACTION
        .mockResolvedValueOnce([[]])   // enterprise 99 không tìm thấy → throw
        .mockResolvedValueOnce([{}]);  // ROLLBACK

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, preferences: [{ enterprise_id: 99, preference_order: 1 }] });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('không tồn tại');
      // ROLLBACK phải được gọi khi throw bên trong transaction
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('TC-SER-014: Trả về lỗi khi DN đã hết slot', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[]])   // chưa có nguyện vọng
        .mockResolvedValueOnce([{}])   // START TRANSACTION
        .mockResolvedValueOnce([[makeEnterprise(1, 10, 10)]])  // hết slot → throw
        .mockResolvedValueOnce([{}]);  // ROLLBACK

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, preferences: [{ enterprise_id: 1, preference_order: 1 }] });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('hết slot');
      // ROLLBACK phải được gọi khi DN hết slot
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('TC-SER-015: Đăng ký 1 nguyện vọng thành công – trả về 201', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[]])             // chưa có nguyện vọng
        .mockResolvedValueOnce([{}])             // START TRANSACTION
        .mockResolvedValueOnce([[makeEnterprise(1, 3, 10)]]) // enterprise OK
        .mockResolvedValueOnce([{}])             // INSERT preference
        .mockResolvedValueOnce([{}]);            // COMMIT

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({ period_id: 1, preferences: [{ enterprise_id: 1, preference_order: 1 }] });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('thành công');
      // Transaction phải kết thúc bằng COMMIT
      expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

    test('TC-SER-016: Đăng ký 3 nguyện vọng theo thứ tự 1-2-3 thành công', async () => {
      db.query
        .mockResolvedValueOnce([[ACTIVE_PERIOD]])
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([[]])               // chưa có nguyện vọng
        .mockResolvedValueOnce([{}])               // START TRANSACTION
        // nguyện vọng 1
        .mockResolvedValueOnce([[makeEnterprise(1, 2, 10)]])
        .mockResolvedValueOnce([{}])               // INSERT
        // nguyện vọng 2
        .mockResolvedValueOnce([[makeEnterprise(2, 1, 10)]])
        .mockResolvedValueOnce([{}])               // INSERT
        // nguyện vọng 3
        .mockResolvedValueOnce([[makeEnterprise(3, 0, 10)]])
        .mockResolvedValueOnce([{}])               // INSERT
        .mockResolvedValueOnce([{}]);              // COMMIT

      const res = await request(app)
        .post('/api/internship-registrations/preferences')
        .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
        .send({
          period_id: 1,
          preferences: [
            { enterprise_id: 1, preference_order: 1 },
            { enterprise_id: 2, preference_order: 2 },
            { enterprise_id: 3, preference_order: 3 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('thành công');
      // Transaction phải kết thúc bằng COMMIT (3 INSERT đều thành công)
      expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

  });

  // ─── PUT /preference/:id/status – Admin duyệt/từ chối ──────────────────────
  describe('PUT /preference/:id/status – Admin duyệt/từ chối nguyện vọng', () => {

    test('TC-SER-017: Trả về 400 khi status không hợp lệ', async () => {
      const res = await request(app)
        .put('/api/internship-registrations/preference/1/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'xyz' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Trạng thái không hợp lệ');
    });

    test('TC-SER-018: Trả về 404 khi nguyện vọng không tồn tại', async () => {
      db.query.mockResolvedValueOnce([[]]); // không tìm thấy preference

      const res = await request(app)
        .put('/api/internship-registrations/preference/999/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'approved' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Không tìm thấy');
    });

    test('TC-SER-019: Duyệt nguyện vọng thành công – auto-reject others + tăng slot DN + COMMIT', async () => {
      db.query
        .mockResolvedValueOnce([[{ student_id: 2, period_id: 1 }]])     // get pref + period_id
        .mockResolvedValueOnce([[{ period_enterprise_id: 10 }]])         // get prefData
        .mockResolvedValueOnce([{}])                                      // START TRANSACTION
        .mockResolvedValueOnce([[{ status: 'pending' }]])                // get oldPref
        .mockResolvedValueOnce([[{ max_slots: 10, current_slots: 3 }]])  // check enterprise slots → OK
        .mockResolvedValueOnce([{}])                                      // UPDATE auto-reject others
        .mockResolvedValueOnce([[]])                                      // get other approved → none
        .mockResolvedValueOnce([{}])                                      // UPDATE increment slots
        .mockResolvedValueOnce([{}])                                      // UPDATE preference status
        .mockResolvedValueOnce([{}]);                                     // COMMIT

      const res = await request(app)
        .put('/api/internship-registrations/preference/1/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
      expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

    test('TC-SER-020: Duyệt nguyện vọng – DN hết slot → 400 + ROLLBACK', async () => {
      db.query
        .mockResolvedValueOnce([[{ student_id: 2, period_id: 1 }]])      // get pref + period_id
        .mockResolvedValueOnce([[{ period_enterprise_id: 10 }]])          // get prefData
        .mockResolvedValueOnce([{}])                                       // START TRANSACTION
        .mockResolvedValueOnce([[{ status: 'pending' }]])                 // get oldPref
        .mockResolvedValueOnce([[{ max_slots: 10, current_slots: 10 }]])  // enterprise FULL → rollback
        .mockResolvedValueOnce([{}]);                                      // ROLLBACK

      const res = await request(app)
        .put('/api/internship-registrations/preference/1/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'approved' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('hết slot');
      expect(db.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('TC-SER-021: Từ chối nguyện vọng đã được duyệt – giảm slot DN + COMMIT', async () => {
      db.query
        .mockResolvedValueOnce([[{ student_id: 2, period_id: 1 }]])   // get pref + period_id
        .mockResolvedValueOnce([[{ period_enterprise_id: 10 }]])       // get prefData
        .mockResolvedValueOnce([{}])                                    // START TRANSACTION
        .mockResolvedValueOnce([[{ status: 'approved' }]])             // get oldPref (was approved)
        .mockResolvedValueOnce([{}])                                    // UPDATE decrement slots
        .mockResolvedValueOnce([{}])                                    // UPDATE preference status
        .mockResolvedValueOnce([{}]);                                   // COMMIT

      const res = await request(app)
        .put('/api/internship-registrations/preference/1/status')
        .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
        .send({ status: 'rejected' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('thành công');
      expect(db.query).toHaveBeenCalledWith('COMMIT');
    });

  });

});
