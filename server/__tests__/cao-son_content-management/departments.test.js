/**
 * ============================================================
 * TEST SUITE: Departments Module (custom route – table: departments)
 * Test Cases: TC119 → TC122
 * File under test: src/routes/departments.js
 * ============================================================
 *   - TC119: Tạo bộ môn hợp lệ                (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC120: Tạo bộ môn thiếu name            (Ngoại lệ)
 *   - TC121: Thêm giảng viên vào bộ môn       (Chuẩn,  CheckDB ✓, Rollback ✓)
 *   - TC122: Xóa giảng viên khỏi bộ môn       (Chuẩn,  CheckDB ✓, Rollback ✓)
 * ============================================================
 */

const request = require('supertest');
const {
  pool,
  ADMIN_TOKEN,
  createCustomApp,
} = require('../setup');

const departmentsRouter = require('../../src/routes/departments');
const departmentsApp = createCustomApp('/api/departments', departmentsRouter);

let createdDepartmentId;
let seedLecturerId;

/* ---- Rollback: dọn dữ liệu test, đảm bảo DB trở về trạng thái ban đầu ---- */
afterAll(async () => {
  /* Gỡ liên kết GV-BM trước khi xóa */
  if (seedLecturerId) {
    await pool.query('UPDATE lecturers SET department_id = NULL WHERE id = ?', [seedLecturerId]);
    await pool.query('DELETE FROM lecturers WHERE id = ?', [seedLecturerId]);
  }
  if (createdDepartmentId) {
    await pool.query('DELETE FROM departments WHERE id = ?', [createdDepartmentId]);
  }
});

/* ============================================================
 * TC119 – Tạo bộ môn hợp lệ
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * Input:  name, description (đầy đủ)
 * Expect: HTTP 201, bản ghi mới trong departments
 * ============================================================ */
describe('TC119 – createDepartment: tạo bộ môn hợp lệ', () => {
  it('should return 201 and persist department to database', async () => {
    const validDepartmentPayload = {
      name: 'Bộ môn CNPM TC119',
      description: 'Mô tả bộ môn kiểm thử',
    };

    const response = await request(departmentsApp)
      .post('/api/departments')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(validDepartmentPayload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(validDepartmentPayload.name);
    createdDepartmentId = response.body.id;

    /* --- CheckDB --- */
    const [dbRows] = await pool.query(
      'SELECT * FROM departments WHERE id = ?',
      [createdDepartmentId]
    );
    expect(dbRows).toHaveLength(1);
    expect(dbRows[0].name).toBe(validDepartmentPayload.name);
  });
});

/* ============================================================
 * TC120 – Tạo bộ môn thiếu name (express-validator)
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * Input:  body chỉ có description, thiếu name
 * Expect: HTTP 400, message 'Validation failed'
 * ============================================================ */
describe('TC120 – createDepartment: thiếu name', () => {
  it('should return 400 with validation error', async () => {
    const missingNamePayload = { description: 'Chỉ có mô tả' };

    const response = await request(departmentsApp)
      .post('/api/departments')
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send(missingNamePayload);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });
});

/* ============================================================
 * TC121 – Thêm giảng viên vào bộ môn
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * Input:  departmentId hợp lệ, lecturer_id hợp lệ
 * Expect: HTTP 201, lecturers.department_id = departmentId
 * ============================================================ */
describe('TC121 – addLecturerToDepartment: thêm GV vào bộ môn', () => {
  /* Seed: tạo 1 giảng viên chưa thuộc bộ môn nào (cần lecturer_code NOT NULL) */
  beforeAll(async () => {
    const [result] = await pool.query(
      "INSERT INTO lecturers (lecturer_code, name, email, phone) VALUES ('TC121-001', 'GV Test TC121', 'tc111@ptit.edu.vn', '0900111222')"
    );
    seedLecturerId = result.insertId;
  });

  it('should return 201 and link lecturer to department in database', async () => {
    const response = await request(departmentsApp)
      .post(`/api/departments/${createdDepartmentId}/lecturers`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
      .send({ lecturer_id: seedLecturerId });

    expect(response.status).toBe(201);

    /* --- CheckDB: xác nhận department_id đã được cập nhật --- */
    const [dbRows] = await pool.query(
      'SELECT department_id FROM lecturers WHERE id = ?',
      [seedLecturerId]
    );
    expect(dbRows[0].department_id).toBe(createdDepartmentId);
  });
});

/* ============================================================
 * TC122 – Xóa giảng viên khỏi bộ môn
 * Loại: Chuẩn | CheckDB: Y | Rollback: Y
 * Input:  departmentId, lecturerId hợp lệ
 * Expect: HTTP 204, lecturers.department_id = NULL
 * ============================================================ */
describe('TC122 – removeLecturerFromDepartment: xóa GV khỏi bộ môn', () => {
  it('should return 204 and set department_id to NULL', async () => {
    const response = await request(departmentsApp)
      .delete(`/api/departments/${createdDepartmentId}/lecturers/${seedLecturerId}`)
      .set('Authorization', `Bearer ${ADMIN_TOKEN}`);

    expect(response.status).toBe(204);

    /* --- CheckDB: xác nhận department_id đã thành NULL --- */
    const [dbRows] = await pool.query(
      'SELECT department_id FROM lecturers WHERE id = ?',
      [seedLecturerId]
    );
    expect(dbRows[0].department_id).toBeNull();
  });
});
