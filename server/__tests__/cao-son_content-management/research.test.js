/**
 * ============================================================
 * TEST SUITE: Research Module (crudFactory – table: research_projects)
 * Test Cases: TC123 → TC125
 * File under test: src/utils/crudFactory.js
 * Route config:    /api/research (server.js)
 * ============================================================
 *   - TC123: Tạo dự án nghiên cứu hợp lệ   (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC124: Tạo dự án thiếu title          (Ngoại lệ)
 *   - TC125: Tìm kiếm nghiên cứu           (Chuẩn)
 * ============================================================
 */

const request = require('supertest');
const {
  pool,
  ADMIN_TOKEN,
  createCrudApp,
  rollbackTable,
} = require('../setup');

const researchApp = createCrudApp('/api/research', {
  tableName: 'research_projects',
  searchableFields: ['title', 'lead_lecturer', 'co_authors'],
});

let createdResearchId;

/* ---- Rollback ---- */
afterAll(async () => {
  await rollbackTable('research_projects');
});

/* ============================================================
 * TC123 – Tạo dự án nghiên cứu hợp lệ
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC123 – createResearch: tạo dự án nghiên cứu hợp lệ', () => {
  it('should return 201 and persist research project to database', async () => {
    const validResearchPayload = {
      title: 'Nghiên cứu AI TC123',
      lead_lecturer: 'GS. Tran Van A',
      co_authors: 'TS. Le Van B',
    };

    const response = await request(researchApp)
      .post('/api/research')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validResearchPayload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    createdResearchId = response.body.id;

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM research_projects WHERE id = ?',
      [createdResearchId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].title).toBe(validResearchPayload.title);
  });
});

/* ============================================================
 * TC124 – Tạo dự án thiếu title
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * ============================================================ */
describe('TC124 – createResearch: thiếu title', () => {
  it('should reject when title is missing (NOT NULL constraint)', async () => {
    const missingTitlePayload = { lead_lecturer: 'GS. A' };

    const response = await request(researchApp)
      .post('/api/research')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingTitlePayload);

    expect(response.status).toBe(500);
  });
});

/* ============================================================
 * TC125 – Tìm kiếm nghiên cứu
 * Loại: Chuẩn | CheckDB: N | Rollback: N
 * ============================================================ */
describe('TC125 – searchResearch: tìm nghiên cứu theo keyword', () => {
  it('should return 200 with results matching keyword', async () => {
    const response = await request(researchApp)
      .get('/api/research?q=AI');

    expect(response.status).toBe(200);
    const results = Array.isArray(response.body) ? response.body : response.body.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
