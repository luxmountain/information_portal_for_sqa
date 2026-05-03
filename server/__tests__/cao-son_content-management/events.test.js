/**
 * ============================================================
 * TEST SUITE: Events Module (crudFactory – table: events)
 * Test Cases: TC107 → TC110
 * File under test: src/utils/crudFactory.js
 * Route config:    /api/events (server.js)
 * ============================================================
 * Mô tả: Kiểm thử CRUD sự kiện.
 *   - TC107: Tạo sự kiện hợp lệ       (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC108: Tạo sự kiện thiếu title   (Ngoại lệ)
 *   - TC109: Cập nhật sự kiện          (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC110: Xóa sự kiện              (Chuẩn,  CheckDB ✓, Rollback ✓)
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
const eventsApp = createCrudApp('/api/events', {
  tableName: 'events',
  searchableFields: ['title', 'location', 'description'],
  nullableFields: ['event_time', 'location', 'description', 'cover_image'],
  dateFields: ['event_date'],
});

let createdEventId;

/* ---- Rollback: xóa toàn bộ dữ liệu test trong bảng events ---- */
afterAll(async () => {
  await rollbackTable('events');
});

/* ============================================================
 * TC107 – Tạo sự kiện hợp lệ
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC107 – createEvent: tạo sự kiện hợp lệ', () => {
  it('should return 201 and persist event to database', async () => {
    const validEventPayload = {
      title: 'Hội thảo AI TC107',
      event_date: '2025-07-01',
      location: 'A1.01',
    };

    const response = await request(eventsApp)
      .post('/api/events')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validEventPayload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe(validEventPayload.title);
    createdEventId = response.body.id;

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM events WHERE id = ?',
      [createdEventId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].title).toBe(validEventPayload.title);
  });
});

/* ============================================================
 * TC108 – Tạo sự kiện thiếu title
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * Expect: HTTP 500 (ER_NO_DEFAULT_FOR_FIELD – title NOT NULL)
 * ============================================================ */
describe('TC108 – createEvent: thiếu title', () => {
  it('should reject when title is missing (NOT NULL constraint)', async () => {
    const missingTitlePayload = { location: 'A1.01' };

    const response = await request(eventsApp)
      .post('/api/events')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingTitlePayload);

    expect(response.status).toBe(500);
  });
});

/* ============================================================
 * TC109 – Cập nhật sự kiện
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC109 – updateEvent: cập nhật location', () => {
  it('should return 200 and update location in database', async () => {
    const updatedLocation = 'B2.02';

    const response = await request(eventsApp)
      .put(`/api/events/${createdEventId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ location: updatedLocation });

    expect(response.status).toBe(200);

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT location FROM events WHERE id = ?',
      [createdEventId]
    );
    expect(dbRows[0].location).toBe(updatedLocation);
  });
});

/* ============================================================
 * TC110 – Xóa sự kiện
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC110 – deleteEvent: xóa sự kiện', () => {
  it('should return 200 and remove event from database', async () => {
    const response = await request(eventsApp)
      .delete(`/api/events/${createdEventId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(response.status).toBe(200);

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM events WHERE id = ?',
      [createdEventId]
    );
    expect(dbRows).toHaveLength(0);
  });
});
