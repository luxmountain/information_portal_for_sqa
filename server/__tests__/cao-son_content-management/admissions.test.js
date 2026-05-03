/**
 * ============================================================
 * TEST SUITE: Admissions Module (crudFactory – table: admissions)
 * Test Cases: TC139 → TC140
 * File under test: src/utils/crudFactory.js
 * Route config:    /api/admissions (server.js)
 * ============================================================
 *   - TC139: Tạo tin tuyển sinh hợp lệ       (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC140: Tạo tin tuyển sinh thiếu year    (Ngoại lệ)
 * ============================================================
 */

const request = require('supertest');
const {
  pool,
  ADMIN_TOKEN,
  createCrudApp,
  rollbackTable,
} = require('../setup');

const admissionsApp = createCrudApp('/api/admissions', {
  tableName: 'admissions',
  searchableFields: ['admission_year', 'description'],
});

let createdAdmissionId;

/* ---- Rollback ---- */
afterAll(async () => {
  await rollbackTable('admissions');
});

/* ============================================================
 * TC139 – Tạo tin tuyển sinh hợp lệ
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC139 – createAdmission: tạo tin tuyển sinh hợp lệ', () => {
  it('should return 201 and persist admission to database', async () => {
    const validAdmissionPayload = {
      title: 'Tuyển sinh 2025 TC139',
      admission_year: 2025,
      description: 'Mô tả tuyển sinh',
    };

    const response = await request(admissionsApp)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validAdmissionPayload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    createdAdmissionId = response.body.id;

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM admissions WHERE id = ?',
      [createdAdmissionId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].admission_year).toBe(2025);
  });
});

/* ============================================================
 * TC140 – Tạo tin tuyển sinh thiếu title (NOT NULL)
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * Ghi chú: admission_year là nullable, nên test thiếu title thay thế
 * Expect: HTTP 500 (ER_NO_DEFAULT_FOR_FIELD – title NOT NULL)
 * ============================================================ */
describe('TC140 – createAdmission: thiếu title (NOT NULL)', () => {
  it('should reject when title is missing (NOT NULL constraint)', async () => {
    const missingTitlePayload = { admission_year: 2025 };

    const response = await request(admissionsApp)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingTitlePayload);

    expect(response.status).toBe(500);
  });
});
