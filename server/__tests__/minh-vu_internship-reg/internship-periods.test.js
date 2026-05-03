// tests/internship-periods.test.js
//
// Unit test cho server/src/routes/internship-periods.js
// Mock dependency bằng setup-mocks.js (jest.doMock).

const path = require('path');
const request = require('supertest');
const { setupMocks } = require('./setup-mocks');
const { makeApp } = require('./helpers');

const ROUTE_PATH =
  process.env.ROUTE_PERIODS_PATH ||
  path.resolve(__dirname, '../../src/routes/internship-periods.js');

const { db, authGuard, adminGuard, router, error } = setupMocks(ROUTE_PATH);

if (!router) {
  // eslint-disable-next-line no-console
  console.warn(
    `[WARN] Không load được ${ROUTE_PATH}: ${error && error.message}.\n` +
      `Set ROUTE_PERIODS_PATH để trỏ đúng tới file route gốc. Test sẽ skip.`
  );
}

const describeIf = router ? describe : describe.skip;

describeIf('internship-periods.js', () => {
  let app;

  beforeAll(() => {
    app = makeApp(router, '/api/internship-periods');
  });

  beforeEach(() => {
    db.__reset();
    authGuard._reset();
    adminGuard._reset();
    authGuard._setUser({ id: 99, role: 'admin' });
  });

  // TC021
  test('TC021 | GET / -> 200, danh sách đợt sắp xếp DESC', async () => {
    const fakeRows = [
      { id: 2, name: 'Đợt 2', start_date: '2025-03-01', end_date: '2025-04-01', is_active: 1 },
      { id: 1, name: 'Đợt 1', start_date: '2025-01-01', end_date: '2025-02-01', is_active: 0 },
    ];
    db.__queue(fakeRows);
    const res = await request(app).get('/api/internship-periods');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeRows);
    expect(db.query.mock.calls[0][0]).toMatch(/ORDER BY start_date DESC/);
  });

  // TC022
  test('TC022 | GET / -> 500 khi DB lỗi', async () => {
    db.__queueError(new Error('DB down'));
    const res = await request(app).get('/api/internship-periods');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Lỗi khi lấy danh sách đợt đăng ký');
  });

  // TC023
  test('TC023 | GET /active -> 200', async () => {
    db.__queue([{ id: 5, name: 'Active', is_active: 1 }]);
    const res = await request(app).get('/api/internship-periods/active');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(5);
  });

  // TC024
  test('TC024 | GET /active -> 404 khi không có đợt active', async () => {
    db.__queue([]);
    const res = await request(app).get('/api/internship-periods/active');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Không có đợt đăng ký/);
  });

  // TC025
  test('TC025 | GET /:id -> 200', async () => {
    db.__queue([{ id: 7, name: 'Đợt 7' }]);
    const res = await request(app).get('/api/internship-periods/7');
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(7);
    expect(db.query.mock.calls[0][1]).toEqual(['7']);
  });

  // TC026
  test('TC026 | GET /:id -> 404 không tìm thấy', async () => {
    db.__queue([]);
    const res = await request(app).get('/api/internship-periods/9999');
    expect(res.status).toBe(404);
  });

  // TC027
  test('TC027 | POST / -> 400 khi có overlap với đợt khác', async () => {
    db.__queue([
      { id: 1, name: 'Đợt cũ', start_date: '2025-01-01', end_date: '2025-03-01' },
    ]);
    const res = await request(app).post('/api/internship-periods').send({
      name: 'Đợt mới',
      start_date: '2025-02-15',
      end_date: '2025-04-01',
      is_active: false,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Đã có đợt "Đợt cũ"/);
  });

  // TC028
  test('TC028 | POST / -> 201, set inactive đợt khác + tạo academy enterprise', async () => {
    db.__queue(
      [],                 // overlap rỗng
      { affectedRows: 5 }, // UPDATE inactive khác
      { insertId: 42 },    // INSERT period
      { affectedRows: 1 }  // INSERT academy enterprise
    );
    const res = await request(app).post('/api/internship-periods').send({
      name: 'Đợt 2025-Q3',
      start_date: '2025-09-01',
      end_date: '2025-11-30',
      description: 'Mô tả',
      is_active: true,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(42);
    expect(db.query).toHaveBeenCalledTimes(4);
    expect(db.query.mock.calls[1][0]).toMatch(/UPDATE internship_periods SET is_active = FALSE/);
    expect(db.query.mock.calls[3][0]).toMatch(/INSERT INTO period_enterprises/);
    expect(db.query.mock.calls[3][1][1]).toBe('Học viện Công nghệ Bưu chính Viễn thông');
  });

  // TC029
  test('TC029 | POST / -> 201 dù INSERT academy enterprise lỗi (catch & log)', async () => {
    db.__queue([], { insertId: 50 });
    db.__queueError(new Error('academy insert failed'));
    const res = await request(app).post('/api/internship-periods').send({
      name: 'Đợt X',
      start_date: '2025-09-01',
      end_date: '2025-11-30',
      is_active: false,
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(50);
  });

  // TC030
  test('TC030 | PUT /:id -> 200 cập nhật thành công', async () => {
    db.__queue([], { affectedRows: 3 }, { affectedRows: 1 });
    const res = await request(app).put('/api/internship-periods/8').send({
      name: 'Đợt 8 sửa',
      start_date: '2025-05-01',
      end_date: '2025-06-01',
      is_active: true,
    });
    expect(res.status).toBe(200);
    expect(db.query.mock.calls[0][0]).toMatch(/WHERE id != \? AND start_date <= \? AND end_date >= \?/);
    expect(db.query.mock.calls[0][1]).toEqual(['8', '2025-06-01', '2025-05-01']);
  });

  // TC031
  test('TC031 | PUT /:id -> 400 khi overlap với đợt khác', async () => {
    db.__queue([
      { id: 11, name: 'Khác', start_date: '2025-04-01', end_date: '2025-06-01' },
    ]);
    const res = await request(app).put('/api/internship-periods/8').send({
      name: 'Đợt 8 sửa',
      start_date: '2025-05-01',
      end_date: '2025-07-01',
      is_active: false,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Không thể cập nhật đợt đăng ký/);
  });

  // TC032
  test('TC032 | DELETE /:id -> 200', async () => {
    db.__queue({ affectedRows: 1 });
    const res = await request(app).delete('/api/internship-periods/15');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Xóa đợt đăng ký thành công/);
    expect(db.query.mock.calls[0][1]).toEqual(['15']);
  });
});
