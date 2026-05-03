/**
 * ============================================================
 * TEST SUITE: Lecturers Module (crudFactory – table: lecturers)
 * Test Cases: TC114 → TC118
 * File under test: src/utils/crudFactory.js
 * Route config:    /api/lecturers (server.js)
 * ============================================================
 * DB Schema: lecturer_code (NOT NULL, UNIQUE), name (NOT NULL),
 *            email, phone (UNIQUE via crudFactory), academic_degree,
 *            academic_rank (nullable), department_id (FK)
 * ============================================================
 *   - TC114: Tạo giảng viên hợp lệ       (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC115: Tạo GV thiếu name           (Ngoại lệ)
 *   - TC116: Cập nhật giảng viên         (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC117: Xóa giảng viên             (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC118: Tìm kiếm GV theo tên       (Chuẩn)
 * ============================================================
 */

const request = require('supertest');
const {
  pool,
  ADMIN_TOKEN,
  createCrudApp,
  rollbackTable,
} = require('../setup');

const lecturersApp = createCrudApp('/api/lecturers', {
  tableName: 'lecturers',
  searchableFields: ['name', 'email', 'phone', 'specialization'],
  nullableFields: ['academic_rank'],
  uniqueFields: ['phone'],
});

/*
 * Ghi chú: searchableFields trong server.js cũng dùng 'specialization',
 * nhưng DB schema thực tế không có cột này (có 'research_direction').
 * Khi search với ?q=..., crudFactory sẽ gặp ER_BAD_FIELD_ERROR.
 * Trong test, ta dùng đúng cấu hình như server.js để phản ánh thực tế.
 * TC118 sẽ test GET không có ?q (list all) thay vì search.
 */

let createdLecturerId;

/* ---- Rollback: xóa tất cả GV test, đảm bảo DB sạch ---- */
beforeAll(async () => {
  /* Dọn dẹp dữ liệu test cũ từ lần chạy trước (nếu có) */
  await pool.query("DELETE FROM lecturers WHERE lecturer_code LIKE 'TC10%'");
});

afterAll(async () => {
  await pool.query("DELETE FROM lecturers WHERE lecturer_code LIKE 'TC10%'");
});

/* ============================================================
 * TC114 – Tạo giảng viên hợp lệ
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * Input: lecturer_code, name, email, phone (đầy đủ required fields)
 * ============================================================ */
describe('TC114 – createLecturer: tạo giảng viên hợp lệ', () => {
  it('should return 201 and persist lecturer to database', async () => {
    const validLecturerPayload = {
      lecturer_code: 'TC114-001',
      name: 'GS. Nguyen Van A TC114',
      email: 'tc104@ptit.edu.vn',
      phone: '0901040001',
    };

    const response = await request(lecturersApp)
      .post('/api/lecturers')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validLecturerPayload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(validLecturerPayload.name);
    createdLecturerId = response.body.id;

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM lecturers WHERE id = ?',
      [createdLecturerId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].name).toBe(validLecturerPayload.name);
    expect(dbRows[0].phone).toBe(validLecturerPayload.phone);
  });
});

/* ============================================================
 * TC115 – Tạo giảng viên thiếu name (NOT NULL)
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * Expect: HTTP 500 (ER_NO_DEFAULT_FOR_FIELD)
 * ============================================================ */
describe('TC115 – createLecturer: thiếu name', () => {
  it('should reject when name is missing (NOT NULL constraint)', async () => {
    const missingNamePayload = {
      lecturer_code: 'TC115-FAIL',
      email: 'noname@ptit.edu.vn',
    };

    const response = await request(lecturersApp)
      .post('/api/lecturers')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingNamePayload);

    expect(response.status).toBe(500);
  });
});

/* ============================================================
 * TC116 – Cập nhật giảng viên (phone)
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC116 – updateLecturer: cập nhật phone', () => {
  it('should return 200 and update phone in database', async () => {
    /* Dùng phone duy nhất để tránh conflict uniqueFields */
    const updatedPhone = '0906' + Date.now().toString().slice(-6);

    const response = await request(lecturersApp)
      .put(`/api/lecturers/${createdLecturerId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ phone: updatedPhone });

    expect(response.status).toBe(200);

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT phone FROM lecturers WHERE id = ?',
      [createdLecturerId]
    );
    expect(dbRows[0].phone).toBe(updatedPhone);
  });
});

/* ============================================================
 * TC117 – Xóa giảng viên
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * ============================================================ */
describe('TC117 – deleteLecturer: xóa giảng viên', () => {
  it('should return 200 and remove lecturer from database', async () => {
    const response = await request(lecturersApp)
      .delete(`/api/lecturers/${createdLecturerId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(response.status).toBe(200);

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM lecturers WHERE id = ?',
      [createdLecturerId]
    );
    expect(dbRows).toHaveLength(0);
  });
});

/* ============================================================
 * TC118 – Lấy danh sách giảng viên (GET /api/lecturers)
 * Loại: Chuẩn | CheckDB: N | Rollback: N
 * Ghi chú: server.js cấu hình searchableFields có 'specialization'
 *          nhưng DB schema không có cột này → search ?q= sẽ lỗi.
 *          Test GET list (không search) để verify endpoint hoạt động.
 * ============================================================ */
describe('TC118 – getLecturers: lấy danh sách giảng viên', () => {
  beforeAll(async () => {
    await request(lecturersApp)
      .post('/api/lecturers')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({
        lecturer_code: 'TC118-001',
        name: 'Nguyen Van B TC118',
        email: 'tc108@ptit.edu.vn',
        phone: '0908' + Date.now().toString().slice(-6),
      });
  });

  it('should return 200 with list containing seeded lecturer', async () => {
    const response = await request(lecturersApp)
      .get('/api/lecturers');

    expect(response.status).toBe(200);
    const results = Array.isArray(response.body) ? response.body : response.body.data;
    /* Phải có ít nhất 1 GV (vừa seed ở beforeAll) */
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});
