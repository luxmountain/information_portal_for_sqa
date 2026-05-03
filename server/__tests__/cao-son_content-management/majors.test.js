/**
 * ============================================================
 * TEST SUITE: Majors & Courses Module (custom route – tables: majors, courses)
 * Test Cases: TC131 → TC134
 * File under test: src/routes/majors.js
 * ============================================================
 *   - TC131: Tạo ngành học hợp lệ            (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC132: Tạo ngành học thiếu name         (Ngoại lệ)
 *   - TC133: Thêm môn học vào ngành           (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC134: Thêm môn học thiếu code          (Ngoại lệ)
 * ============================================================
 */

const request = require('supertest');
const {
  pool,
  ADMIN_TOKEN,
  createCustomApp,
} = require('../setup');

const majorsRouter = require('../../src/routes/majors');
const majorsApp = createCustomApp('/api/majors', majorsRouter);

let createdMajorId;
let createdCourseId;

/* ---- Rollback: xóa courses trước (FK), rồi xóa majors ---- */
afterAll(async () => {
  if (createdMajorId) {
    await pool.query('DELETE FROM courses WHERE major_id = ?', [createdMajorId]);
    await pool.query('DELETE FROM majors WHERE id = ?', [createdMajorId]);
  }
});

/* ============================================================
 * TC131 – Tạo ngành học hợp lệ
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC131 – createMajor: tạo ngành học hợp lệ', () => {
  it('should return 201 and persist major to database', async () => {
    const validMajorPayload = {
      name: 'Kỹ thuật phần mềm TC131',
      sort_order: 1,
    };

    const response = await request(majorsApp)
      .post('/api/majors')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validMajorPayload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(validMajorPayload.name);
    createdMajorId = response.body.id;

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM majors WHERE id = ?',
      [createdMajorId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].name).toBe(validMajorPayload.name);
  });
});

/* ============================================================
 * TC132 – Tạo ngành học thiếu name
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * Expect: HTTP 500 (ER_NO_DEFAULT_FOR_FIELD – name NOT NULL)
 * ============================================================ */
describe('TC132 – createMajor: thiếu name', () => {
  it('should reject when name is missing (NOT NULL constraint)', async () => {
    const missingNamePayload = { sort_order: 2 };

    const response = await request(majorsApp)
      .post('/api/majors')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingNamePayload);

    expect(response.status).toBe(500);
  });
});

/* ============================================================
 * TC133 – Thêm môn học vào ngành
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * Input:  majorId hợp lệ, name, code, credits, semester
 * Expect: HTTP 201, courses.major_id = majorId
 * ============================================================ */
describe('TC133 – addCourseToMajor: thêm môn học hợp lệ', () => {
  it('should return 201 and persist course linked to major', async () => {
    const validCoursePayload = {
      name: 'Lập trình web TC133',
      code: 'IT3456',
      credits: 3,
      semester: 5,
    };

    const response = await request(majorsApp)
      .post(`/api/majors/${createdMajorId}/courses`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validCoursePayload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    createdCourseId = response.body.id;

    /* --- CheckDB: xác nhận course tồn tại và liên kết đúng major --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM courses WHERE id = ?',
      [createdCourseId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].major_id).toBe(createdMajorId);
    expect(dbRows[0].code).toBe(validCoursePayload.code);
  });
});

/* ============================================================
 * TC134 – Thêm môn học thiếu code
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * ============================================================ */
describe('TC134 – addCourseToMajor: thiếu code', () => {
  it('should reject when code is missing (NOT NULL constraint)', async () => {
    const missingCodePayload = { name: 'Lập trình web', credits: 3 };

    const response = await request(majorsApp)
      .post(`/api/majors/${createdMajorId}/courses`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingCodePayload);

    expect(response.status).toBe(500);
  });
});
