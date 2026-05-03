// tests/internship-lecturers.test.js
//
// Unit test cho server/src/routes/internship-lecturers.js

const path = require('path');
const request = require('supertest');
const { setupMocks } = require('./setup-mocks');
const { makeApp } = require('./helpers');

const ROUTE_PATH =
  process.env.ROUTE_LECTURERS_PATH ||
  path.resolve(__dirname, '../../src/routes/internship-lecturers.js');

const { db, authGuard, adminGuard, router, error } = setupMocks(ROUTE_PATH);

if (!router) {
  // eslint-disable-next-line no-console
  console.warn(
    `[WARN] Không load được ${ROUTE_PATH}: ${error && error.message}.\n` +
      `Set ROUTE_LECTURERS_PATH để trỏ đúng tới file route gốc. Test sẽ skip.`
  );
}

const describeIf = router ? describe : describe.skip;

describeIf('internship-lecturers.js', () => {
  let app;

  beforeAll(() => {
    app = makeApp(router, '/api/internship-lecturers');
  });

  beforeEach(() => {
    db.__reset();
    authGuard._reset();
    adminGuard._reset();
    authGuard._setUser({ id: 1, role: 'admin' });
  });

  // TC-IL-01
  test('TC-IL-01 | GET / thiếu period_id -> 400', async () => {
    const res = await request(app).get('/api/internship-lecturers');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Thiếu period_id/);
    expect(db.query).not.toHaveBeenCalled();
  });

  // TC-IL-02
  test('TC-IL-02 | GET /?period_id=1 -> 200 trả về danh sách giảng viên', async () => {
    const fake = [
      { id: 1, name: 'Nguyễn A', can_guide: 1, max_slots: 10, current_slots: 2, available_slots: 8 },
      { id: 2, name: 'Trần B', can_guide: 0, max_slots: 5, current_slots: 0, available_slots: 5 },
    ];
    db.__queue(fake);
    const res = await request(app).get('/api/internship-lecturers').query({ period_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fake);
    expect(db.query.mock.calls[0][1]).toEqual(['1']);
  });

  // TC-IL-03
  test('TC-IL-03 | GET /?period_id=1&can_guide=true -> 200 thêm filter can_guide', async () => {
    db.__queue([]);
    const res = await request(app)
      .get('/api/internship-lecturers')
      .query({ period_id: 1, can_guide: 'true' });
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][0]).toMatch(/AND lp\.can_guide = \?/);
    expect(db.query.mock.calls[0][1]).toEqual(['1', 1]);
  });

  // TC-IL-04
  test('TC-IL-04 | GET / -> 500 khi DB lỗi', async () => {
    db.__queueError(new Error('DB fail'));
    const res = await request(app).get('/api/internship-lecturers').query({ period_id: 1 });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Lỗi khi lấy danh sách giảng viên/);
  });

  // TC-IL-05
  test('TC-IL-05 | GET /available thiếu period_id -> 400', async () => {
    const res = await request(app).get('/api/internship-lecturers/available');
    expect(res.status).toBe(400);
  });

  // TC-IL-06
  test('TC-IL-06 | GET /available -> 200 chỉ trả về giảng viên còn slot', async () => {
    db.__queue([
      { id: 10, name: 'GV A', max_slots: 10, current_slots: 5, available_slots: 5 },
    ]);
    const res = await request(app)
      .get('/api/internship-lecturers/available')
      .query({ period_id: 3 });
    expect(res.status).toBe(200);
    expect(res.body[0].available_slots).toBe(5);
    expect(db.query.mock.calls[0][0]).toMatch(/lp\.can_guide = TRUE AND \(lp\.max_slots - lp\.current_slots\) > 0/);
  });

  // TC-IL-07
  test('TC-IL-07 | POST / thiếu lecturer_id -> 400', async () => {
    const res = await request(app)
      .post('/api/internship-lecturers')
      .send({ period_id: 1 });
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  // TC-IL-08
  test('TC-IL-08 | POST / -> 200 INSERT...ON DUPLICATE KEY UPDATE', async () => {
    db.__queue({ affectedRows: 1, insertId: 5 });
    const res = await request(app).post('/api/internship-lecturers').send({
      period_id: 1,
      lecturer_id: 7,
      can_guide: true,
      max_slots: 15,
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Cập nhật cấu hình giảng viên thành công/);
    expect(db.query.mock.calls[0][0]).toMatch(/INSERT INTO lecturer_periods/);
    expect(db.query.mock.calls[0][1]).toEqual([1, 7, true, 15]);
  });

  // TC-IL-09
  test('TC-IL-09 | PUT /batch -> 200 commit transaction', async () => {
    db.__queue(
      [], // START TRANSACTION
      { affectedRows: 1 },
      { affectedRows: 1 },
      [] // COMMIT
    );
    const res = await request(app).put('/api/internship-lecturers/batch').send({
      period_id: 1,
      lecturers: [
        { lecturer_id: 1, can_guide: true, max_slots: 10 },
        { lecturer_id: 2, can_guide: false, max_slots: 5 },
      ],
    });
    expect(res.status).toBe(200);
    const sqlCalls = db.query.mock.calls.map((c) => c[0]);
    expect(sqlCalls).toContain('START TRANSACTION');
    expect(sqlCalls).toContain('COMMIT');
    expect(sqlCalls).not.toContain('ROLLBACK');
  });

  // TC-IL-10
  test('TC-IL-10 | PUT /batch -> 500 và ROLLBACK khi INSERT trong loop bị lỗi', async () => {
    db.__queue([]);                 // START TRANSACTION
    db.__queue({ affectedRows: 1 }); // INSERT 1 OK
    db.__queueError(new Error('duplicate or fk'));
    db.__queue([]); // ROLLBACK

    const res = await request(app).put('/api/internship-lecturers/batch').send({
      period_id: 1,
      lecturers: [
        { lecturer_id: 1, can_guide: true, max_slots: 10 },
        { lecturer_id: 2, can_guide: true, max_slots: 5 },
      ],
    });
    expect(res.status).toBe(500);
    const sqlCalls = db.query.mock.calls.map((c) => c[0]);
    expect(sqlCalls).toContain('START TRANSACTION');
    expect(sqlCalls).toContain('ROLLBACK');
    expect(sqlCalls).not.toContain('COMMIT');
  });
});
