/**
 * ============================================================
 * TEST SUITE: Student Documents Module (crudFactory – table: student_documents)
 * Test Cases: TC126 → TC130
 * File under test: src/utils/crudFactory.js
 * Route config:    /api/student-documents (server.js)
 * ============================================================
 *   - TC126: Tạo tài liệu SV hợp lệ       (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC127: Tạo tài liệu thiếu title      (Ngoại lệ)
 *   - TC128: Lọc tài liệu theo category    (Chuẩn)
 *   - TC129: Cập nhật tài liệu             (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC130: Xóa tài liệu                  (Chuẩn,  CheckDB ✓, Rollback ✓)
 * ============================================================
 */

const request = require('supertest');
const {
  pool,
  ADMIN_TOKEN,
  createCrudApp,
  rollbackTable,
} = require('../setup');

const studentDocsApp = createCrudApp('/api/student-documents', {
  tableName: 'student_documents',
  searchableFields: ['title', 'category'],
});

let createdDocumentId;

/* ---- Rollback ---- */
afterAll(async () => {
  await rollbackTable('student_documents');
});

/* ============================================================
 * TC126 – Tạo tài liệu SV hợp lệ
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC126 – createDocument: tạo tài liệu SV hợp lệ', () => {
  it('should return 201 and persist document to database', async () => {
    const validDocumentPayload = {
      title: 'Quy định thực tập TC126',
      category: 'regulation',
      file_url: 'https://example.com/file.pdf',
    };

    const response = await request(studentDocsApp)
      .post('/api/student-documents')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validDocumentPayload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    createdDocumentId = response.body.id;

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM student_documents WHERE id = ?',
      [createdDocumentId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].title).toBe(validDocumentPayload.title);
  });
});

/* ============================================================
 * TC127 – Tạo tài liệu thiếu title
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * ============================================================ */
describe('TC127 – createDocument: thiếu title', () => {
  it('should reject when title is missing (NOT NULL constraint)', async () => {
    const missingTitlePayload = { category: 'regulation' };

    const response = await request(studentDocsApp)
      .post('/api/student-documents')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingTitlePayload);

    expect(response.status).toBe(500);
  });
});

/* ============================================================
 * TC128 – Lọc tài liệu theo category
 * Loại: Chuẩn | CheckDB: N | Rollback: N
 * ============================================================ */
describe('TC128 – filterDocuments: lọc theo category', () => {
  it('should return 200 with results matching category keyword', async () => {
    const response = await request(studentDocsApp)
      .get('/api/student-documents?q=regulation');

    expect(response.status).toBe(200);
    const results = Array.isArray(response.body) ? response.body : response.body.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

/* ============================================================
 * TC129 – Cập nhật tài liệu
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC129 – updateDocument: cập nhật title', () => {
  it('should return 200 and update title in database', async () => {
    const updatedTitle = 'Tiêu đề mới TC129';

    const response = await request(studentDocsApp)
      .put(`/api/student-documents/${createdDocumentId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ title: updatedTitle });

    expect(response.status).toBe(200);

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT title FROM student_documents WHERE id = ?',
      [createdDocumentId]
    );
    expect(dbRows[0].title).toBe(updatedTitle);
  });
});

/* ============================================================
 * TC130 – Xóa tài liệu
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC130 – deleteDocument: xóa tài liệu', () => {
  it('should return 200 and remove document from database', async () => {
    const response = await request(studentDocsApp)
      .delete(`/api/student-documents/${createdDocumentId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(response.status).toBe(200);

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM student_documents WHERE id = ?',
      [createdDocumentId]
    );
    expect(dbRows).toHaveLength(0);
  });
});
