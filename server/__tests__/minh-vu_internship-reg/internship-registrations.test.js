// tests/internship-registrations.test.js
//
// Unit test cho server/src/routes/internship-registrations.js

const path = require('path');
const request = require('supertest');
const { setupMocks } = require('./setup-mocks');
const { makeApp } = require('./helpers');

const ROUTE_PATH =
  process.env.ROUTE_REG_PATH ||
  path.resolve(__dirname, '../../src/routes/internship-registrations.js');

const { db, authGuard, adminGuard, router, error } = setupMocks(ROUTE_PATH);

if (!router) {
  // eslint-disable-next-line no-console
  console.warn(
    `[WARN] Không load được ${ROUTE_PATH}: ${error && error.message}.\n` +
      `Set ROUTE_REG_PATH để trỏ đúng tới file route gốc. Test sẽ skip.`
  );
}

const describeIf = router ? describe : describe.skip;

function activePeriod(overrides = {}) {
  return {
    id: 1,
    name: 'Đợt test',
    is_active: 1,
    start_date: new Date(Date.now() - 86400000).toISOString(),
    end_date: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
}

describeIf('internship-registrations.js', () => {
  let app;

  beforeAll(() => {
    app = makeApp(router, '/api/internship-registrations');
  });

  beforeEach(() => {
    db.__reset();
    authGuard._reset();
    adminGuard._reset();
  });

  // ==================== GET /my-lecturer ====================
  // TC-IR-01
  test('TC-IR-01 | GET /my-lecturer -> 200 lọc theo studentId', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    db.__queue([
      { id: 100, student_id: 5, lecturer_period_id: 7, status: 'approved', lecturer_name: 'GV A' },
    ]);
    const res = await request(app).get('/api/internship-registrations/my-lecturer');
    expect(res.status).toBe(200);
    expect(res.body[0].student_id).toBe(5);
    expect(db.query.mock.calls[0][1][0]).toBe(5);
  });

  // TC-IR-02
  test('TC-IR-02 | GET /my-lecturer?period_id=2 -> 200 thêm điều kiện period_id', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    db.__queue([]);
    const res = await request(app)
      .get('/api/internship-registrations/my-lecturer')
      .query({ period_id: 2 });
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][0]).toMatch(/AND lp\.period_id = \?/);
    expect(db.query.mock.calls[0][1]).toEqual([5, '2']);
  });

  // ==================== POST /lecturer ====================
  // TC-IR-03
  test('TC-IR-03 | POST /lecturer thiếu lecturer_id -> 400', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    const res = await request(app)
      .post('/api/internship-registrations/lecturer')
      .send({ period_id: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Thiếu period_id hoặc lecturer_id/);
    expect(db.query).not.toHaveBeenCalled();
  });

  // TC-IR-04
  test('TC-IR-04 | POST /lecturer -> 400 khi period không active', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    db.__queue([]);
    const res = await request(app)
      .post('/api/internship-registrations/lecturer')
      .send({ period_id: 1, lecturer_id: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/không tồn tại hoặc không đang hoạt động/);
  });

  // TC-IR-05
  test('TC-IR-05 | POST /lecturer -> 400 ngoài thời gian đăng ký', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    db.__queue([
      activePeriod({
        start_date: new Date(Date.now() - 10 * 86400000).toISOString(),
        end_date: new Date(Date.now() - 5 * 86400000).toISOString(),
      }),
    ]);
    const res = await request(app)
      .post('/api/internship-registrations/lecturer')
      .send({ period_id: 1, lecturer_id: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Không trong thời gian đăng ký/);
  });

  // TC-IR-06
  test('TC-IR-06 | POST /lecturer -> 400 khi giảng viên hết slot', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    db.__queue(
      [activePeriod()],
      [{ id: 9, can_guide: 1, max_slots: 10, current_slots: 10 }]
    );
    const res = await request(app)
      .post('/api/internship-registrations/lecturer')
      .send({ period_id: 1, lecturer_id: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đã hết slot/);
  });

  // TC-IR-07
  test('TC-IR-07 | POST /lecturer -> 201 đăng ký mới thành công + COMMIT', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    db.__queue(
      [activePeriod()],
      [{ id: 9, can_guide: 1, max_slots: 10, current_slots: 2 }],
      [],
      [], // START TRANSACTION
      { insertId: 1, affectedRows: 1 },
      { affectedRows: 1 },
      [] // COMMIT
    );
    const res = await request(app)
      .post('/api/internship-registrations/lecturer')
      .send({ period_id: 1, lecturer_id: 3 });
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/Đăng ký giảng viên thành công/);
    const sqlCalls = db.query.mock.calls.map((c) => c[0]);
    expect(sqlCalls).toContain('START TRANSACTION');
    expect(sqlCalls).toContain('COMMIT');
    expect(sqlCalls).not.toContain('ROLLBACK');
  });

  // ==================== POST /preferences ====================
  // TC-IR-08
  test('TC-IR-08 | POST /preferences -> 400 khi > 5 nguyện vọng', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    const prefs = [1, 2, 3, 4, 5, 6].map((i) => ({ enterprise_id: i, preference_order: i }));
    const res = await request(app)
      .post('/api/internship-registrations/preferences')
      .send({ period_id: 1, preferences: prefs });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tối đa 5 nguyện vọng/);
    expect(db.query).not.toHaveBeenCalled();
  });

  // TC-IR-09
  test('TC-IR-09 | POST /preferences -> 400 khi sinh viên chưa đăng ký giảng viên', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    db.__queue(
      [activePeriod()],
      [] // chưa đăng ký GV
    );
    const res = await request(app)
      .post('/api/internship-registrations/preferences')
      .send({
        period_id: 1,
        preferences: [{ enterprise_id: 1, preference_order: 1 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/phải đăng ký giảng viên hướng dẫn trước/);
  });

  // TC-IR-10
  test('TC-IR-10 | POST /preferences -> 400 khi đã đăng ký nguyện vọng trong đợt', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    db.__queue(
      [activePeriod()],
      [{ id: 1 }], // đã đăng ký GV
      [{ id: 99 }] // đã có preferences
    );
    const res = await request(app)
      .post('/api/internship-registrations/preferences')
      .send({
        period_id: 1,
        preferences: [{ enterprise_id: 1, preference_order: 1 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đã đăng ký nguyện vọng/);
  });

  // TC-IR-11
  test('TC-IR-11 | POST /preferences -> 400 khi thứ tự nguyện vọng trùng', async () => {
    authGuard._setUser({ id: 5, role: 'student' });
    db.__queue(
      [activePeriod()],
      [{ id: 1 }],
      []
    );
    const res = await request(app)
      .post('/api/internship-registrations/preferences')
      .send({
        period_id: 1,
        preferences: [
          { enterprise_id: 1, preference_order: 1 },
          { enterprise_id: 2, preference_order: 1 },
        ],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Thứ tự nguyện vọng/);
  });

  // ==================== GET /all ====================
  // TC-IR-12
  test('TC-IR-12 | GET /all không có type -> 400', async () => {
    authGuard._setUser({ id: 1, role: 'admin' });
    const res = await request(app).get('/api/internship-registrations/all');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  // TC-IR-13
  test('TC-IR-13 | GET /all?type=lecturer -> 200', async () => {
    authGuard._setUser({ id: 1, role: 'admin' });
    db.__queue([{ id: 1, student_name: 'A', lecturer_name: 'GV X' }]);
    const res = await request(app)
      .get('/api/internship-registrations/all')
      .query({ type: 'lecturer' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ==================== PUT /lecturer/:id/status ====================
  // TC-IR-14
  test('TC-IR-14 | PUT /lecturer/:id/status -> 400 status không hợp lệ', async () => {
    authGuard._setUser({ id: 1, role: 'admin' });
    const res = await request(app)
      .put('/api/internship-registrations/lecturer/1/status')
      .send({ status: 'unknown' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Trạng thái không hợp lệ/);
    expect(db.query).not.toHaveBeenCalled();
  });

  // TC-IR-15
  test('TC-IR-15 | PUT /lecturer/:id/status -> 200 cập nhật approved', async () => {
    authGuard._setUser({ id: 1, role: 'admin' });
    db.__queue({ affectedRows: 1 });
    const res = await request(app)
      .put('/api/internship-registrations/lecturer/10/status')
      .send({ status: 'approved', notes: 'OK' });
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][1]).toEqual(['approved', 'OK', '10']);
  });

  // ==================== POST /approve-to-academy ====================
  // TC-IR-16
  test('TC-IR-16 | POST /approve-to-academy -> 404 khi không tìm thấy đơn vị Học viện', async () => {
    authGuard._setUser({ id: 1, role: 'admin' });
    db.__queue([]);
    const res = await request(app)
      .post('/api/internship-registrations/approve-to-academy')
      .send({ student_id: 5, period_id: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Học viện/);
  });
});
