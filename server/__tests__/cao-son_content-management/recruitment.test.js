/**
 * ============================================================
 * TEST SUITE: Recruitment Module (crudFactory – table: recruitment_posts)
 * Test Cases: TC111 → TC113
 * File under test: src/utils/crudFactory.js
 * Route config:    /api/recruitment (server.js)
 * ============================================================
 *   - TC111: Tạo tin tuyển dụng hợp lệ   (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC112: Tạo tin thiếu title          (Ngoại lệ)
 *   - TC113: Lọc tuyển dụng theo keyword  (Chuẩn)
 * ============================================================
 */

const request = require('supertest');
const {
  pool,
  ADMIN_TOKEN,
  createCrudApp,
  rollbackTable,
} = require('../setup');

const recruitmentApp = createCrudApp('/api/recruitment', {
  tableName: 'recruitment_posts',
  searchableFields: ['title', 'company_name', 'position', 'job_description'],
});

let createdRecruitmentId;

/* ---- Rollback ---- */
afterAll(async () => {
  await rollbackTable('recruitment_posts');
});

/* ============================================================
 * TC111 – Tạo tin tuyển dụng hợp lệ
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC111 – createRecruitment: tạo tin tuyển dụng hợp lệ', () => {
  it('should return 201 and persist recruitment post to database', async () => {
    const validRecruitmentPayload = {
      title: 'Backend Developer TC111',
      company_name: 'Google',
      position: 'Senior',
    };

    const response = await request(recruitmentApp)
      .post('/api/recruitment')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validRecruitmentPayload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    createdRecruitmentId = response.body.id;

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM recruitment_posts WHERE id = ?',
      [createdRecruitmentId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].title).toBe(validRecruitmentPayload.title);
  });
});

/* ============================================================
 * TC112 – Tạo tin tuyển dụng thiếu title
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * ============================================================ */
describe('TC112 – createRecruitment: thiếu title', () => {
  it('should reject when title is missing (NOT NULL constraint)', async () => {
    const missingTitlePayload = { company_name: 'Google' };

    const response = await request(recruitmentApp)
      .post('/api/recruitment')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingTitlePayload);

    expect(response.status).toBe(500);
  });
});

/* ============================================================
 * TC113 – Lọc tuyển dụng theo company_name
 * Loại: Chuẩn | CheckDB: N | Rollback: N
 * ============================================================ */
describe('TC113 – filterRecruitment: tìm theo company_name', () => {
  it('should return 200 with results matching keyword', async () => {
    const response = await request(recruitmentApp)
      .get('/api/recruitment?q=Google');

    expect(response.status).toBe(200);
    const results = Array.isArray(response.body) ? response.body : response.body.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
