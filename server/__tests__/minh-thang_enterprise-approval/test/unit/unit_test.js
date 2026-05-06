// TC056–TC090 | MEMBER 3 – Enterprise & Approval
// Files: period-enterprises.js | internship-registrations.js | students.js
// Run: npx jest test/unit/TC056_TC090_enterprise_approval.test.js --coverage
const os = require('os'); // Thêm dòng này vào đầu file test
const request = require('supertest');
const app = require('../../../../src/server.js');
const pool = require('../../../../src/config/db.js');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ─── Helpers ────────────────────────────────────────────────────────────────

let adminToken;
let studentToken;
let connection;

const JWT_SECRET = process.env.JWT_SECRET || 'fit-secret';

beforeAll(async () => {
  connection = await pool.getConnection();
  adminToken = jwt.sign({ id: 9999, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
  studentToken = jwt.sign({ id: 8888, role: 'student' }, JWT_SECRET, { expiresIn: '1h' });
});

afterAll(async () => {
  if (connection) connection.release();
  await pool.end();
});

jest.setTimeout(30000);

// ─── withTransaction wrapper ─────────────────────────────────────────────────
const withTransaction = (fn) => async () => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  // Cho phép đọc dữ liệu chưa commit trong cùng transaction
  await conn.query('SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED');
  try {
    await fn(conn);
  } finally {
    await conn.rollback();
    conn.release();
  }
};

// ─── Seed helpers ────────────────────────────────────────────────────────────

/**
 * Seed một đợt thực tập (internship_periods)
 * Khớp với schema: id, name, start_date, end_date, is_active, description, created_at, updated_at
 */
async function seedPeriod(conn) {
  const [r] = await conn.query(
    `INSERT INTO internship_periods (name, start_date, end_date, is_active)
     VALUES (?,?,?,?)`,
    ['Test Period', '2020-01-01', '2099-12-31', 1]
  );
  return r.insertId;
}

/**
 * Seed một doanh nghiệp trong đợt (period_enterprises)
 * Khớp với schema: id, period_id, name, job_description, address, contact_info,
 *                  max_slots, current_slots, is_active, created_at, updated_at
 */
async function seedEnterprise(conn, periodId, name = 'Test Corp', maxSlots = 10) {
  const [r] = await conn.query(
    `INSERT INTO period_enterprises (period_id, name, max_slots, is_active, current_slots)
     VALUES (?,?,?,?,?)`,
    [periodId, name, maxSlots, 1, 0]
  );
  return r.insertId;
}

/**
 * Seed một sinh viên (students)
 * Khớp với schema: id, student_code, name, email, password_hash, phone,
 *                  major_id, class_name, date_of_birth, gpa, created_at
 * major_id = 1 ('Khoa học máy tính') phải tồn tại trong bảng majors
 */
async function seedStudent(conn, code = 'B99TEST01') {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('pass123', 10);
  const [r] = await conn.query(
    `INSERT INTO students (student_code, name, email, password_hash, phone, class_name, date_of_birth, gpa, major_id)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [code, 'Test Student', `${code}@ptit.edu.vn`, hash, '0900000001', 'D21TEST', '2003-01-01', 3.5, 1]
  );
  return r.insertId;
}

/**
 * Seed giảng viên + gán vào đợt (lecturers + lecturer_periods)
 * Trả về { lecturerId, lecturerPeriodId }
 * Khớp với schema:
 *   lecturers: id, lecturer_code, name, email, phone, academic_degree, academic_rank, research_direction, department_id, created_at
 *   lecturer_periods: id, period_id, lecturer_id, can_guide, max_slots, current_slots, created_at, updated_at
 */
async function seedLecturerPeriod(conn, periodId, code = 'GV_TEST', maxSlots = 5) {
  const [lec] = await conn.query(
    `INSERT INTO lecturers (lecturer_code, name, email) VALUES (?,?,?)`,
    [code, 'Test Lecturer', `${code}@ptit.edu.vn`]
  );
  const [lp] = await conn.query(
    `INSERT INTO lecturer_periods (lecturer_id, period_id, max_slots, current_slots, can_guide)
     VALUES (?,?,?,?,?)`,
    [lec.insertId, periodId, maxSlots, 0, 1]
  );
  return { lecturerId: lec.insertId, lecturerPeriodId: lp.insertId };
}

/**
 * Seed nguyện vọng doanh nghiệp (student_enterprise_preferences)
 * Khớp với schema: id, student_id, period_id, period_enterprise_id, preference_order,
 *                  notes, status, registered_at, reviewed_at
 * Lưu ý: cột đã đổi tên từ enterprise_id → period_enterprise_id
 */
async function seedPreference(conn, studentId, periodEnterpriseId, order = 1, status = 'pending') {
  const [r] = await conn.query(
    `INSERT INTO student_enterprise_preferences (student_id, period_enterprise_id, preference_order, status)
     VALUES (?,?,?,?)`,
    [studentId, periodEnterpriseId, order, status]
  );
  return r.insertId;
}

/**
 * Seed đăng ký giảng viên hướng dẫn (student_lecturer_registrations)
 * Khớp với schema: id, student_id, lecturer_period_id, status, notes, registered_at, reviewed_at
 * Lưu ý: cột đã refactor từ (period_id + lecturer_id) → lecturer_period_id (FK tới lecturer_periods)
 */
async function seedLecturerReg(conn, studentId, lecturerPeriodId) {
  await conn.query(
    `INSERT INTO student_lecturer_registrations (student_id, lecturer_period_id, status, reviewed_at)
     VALUES (?,?,'approved',NOW())`,
    [studentId, lecturerPeriodId]
  );
  await conn.query(
    `UPDATE lecturer_periods SET current_slots = current_slots + 1 WHERE id = ?`,
    [lecturerPeriodId]
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TC056–TC061 │ period-enterprises.js
// ════════════════════════════════════════════════════════════════════════════

describe('period-enterprises.js', () => {

  // TC056 – Thêm doanh nghiệp vào đợt – dữ liệu hợp lệ
test('TC056 – POST /api/period-enterprises – valid input returns 201', async () => {
  // --- CHUẨN BỊ (Setup) ---
  // Đảm bảo periodId = 1 tồn tại (như bạn đã thấy trong MySQL Workbench)
  const periodId = 1; 
  const enterpriseName = 'FPT Software Unit Test ' + Date.now(); // Dùng thêm timestamp để tránh trùng tên (nếu có UNIQUE)
  
  const validPayload = {
    period_id: periodId,
    name: enterpriseName,
    job_description: 'Backend intern',
    address: 'Hà Nội',
    contact_info: 'hr@fpt.com',
    max_slots: 10,
    is_active: true,
  };

  let createdId = null;

  try {
    // --- THỰC HIỆN (Action) ---
    const res = await request(app)
      .post('/api/period-enterprises')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validPayload);

    // Kiểm tra status code trả về
    expect(res.status).toBe(201);
    createdId = res.body.id; // Lấy ID để lát nữa CheckDB và Rollback

    // --- KIỂM TRA DB (CheckDB) ---
    // Yêu cầu 2: Xác minh dữ liệu đã vào DB đúng chưa
    const [rows] = await pool.query('SELECT * FROM period_enterprises WHERE id = ?', [createdId]);
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe(enterpriseName);

  } finally {
    // --- HOÀN TRẢ (Rollback) ---
    // Yêu cầu 2: Đảm bảo DB quay về trạng thái ban đầu sau khi test
    if (createdId) {
      await pool.query('DELETE FROM period_enterprises WHERE id = ?', [createdId]);
      // console.log(`Rollback: Đã xóa enterprise ID ${createdId}`);
    }
  }
}, 10000); // Tăng timeout lên 10s cho chắc chắn

  // TC057 – Thiếu trường bắt buộc 'name'
  test("TC057 – POST /api/period-enterprises – missing 'name' returns 400", async () => {
    const res = await request(app)
      .post('/api/period-enterprises')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ period_id: 1 }); // Thiếu name

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/period_id và name là bắt buộc/);
  });

  /**
 * TC058 – PUT /api/period-enterprises/:id – valid update returns 200
 * Mục tiêu: Kiểm tra chức năng cập nhật thông tin doanh nghiệp đã tồn tại.
 * Yêu cầu: Kiểm tra DB sau khi sửa và Rollback (xóa dữ liệu) sau khi test.
 */
test('TC058 – PUT /api/period-enterprises/:id – valid update returns 200', async () => {
  // --- 1. CHUẨN BỊ DỮ LIỆU (Setup) ---
  const periodId = 1; // ID đợt thực tập giả định đã có trong DB
  const originalName = 'Enterprise for Update Test ' + Date.now();
  const updatedName = 'CMC Corp Updated ' + Date.now();
  
  let createdId = null;

  try {
    // Bước 1.1: Tạo trước 1 doanh nghiệp để có cái mà cập nhật
    const [insertResult] = await pool.query(
      `INSERT INTO period_enterprises (period_id, name, job_description, address, contact_info, max_slots, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [periodId, originalName, 'Old Job', 'Old Address', 'old@contact.com', 5, true]
    );
    createdId = insertResult.insertId;

    const updatePayload = {
      name: updatedName,
      job_description: 'Lập trình viên Fullstack',
      address: 'Duy Tân, Cầu Giấy, Hà Nội',
      contact_info: 'hr@cmc.com.vn',
      max_slots: 15,
      is_active: false
    };

    // --- 2. THỰC THI (Action) ---
    // Giả lập Admin nhấn nút "Cập nhật" trên giao diện
    const res = await request(app)
      .put(`/api/period-enterprises/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatePayload);

    // Kiểm tra phản hồi từ Server (200 OK)
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(updatedName);

    // --- 3. KIỂM TRA DATABASE (CheckDB) ---
    // Truy vấn trực tiếp vào DB để xác nhận các trường thông tin đã thay đổi
    const [rows] = await pool.query(
      'SELECT name, max_slots, is_active FROM period_enterprises WHERE id = ?', 
      [createdId]
    );

    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe(updatedName);
    expect(rows[0].max_slots).toBe(15);
    expect(rows[0].is_active).toBe(0); // MySQL lưu boolean là 0/1

  } finally {
    // --- 4. HOÀN TRẢ TRẠNG THÁI (Rollback) ---
    // Xóa bản ghi test để DB trở lại trạng thái sạch như ban đầu
    if (createdId) {
      await pool.query('DELETE FROM period_enterprises WHERE id = ?', [createdId]);
      // console.log(`[TC058] Rollback: Đã xóa dữ liệu test ID: ${createdId}`);
    }
  }
});

  // TC059 – Cập nhật ID không tồn tại
  test('TC059 – PUT /api/period-enterprises/:id – non-existent ID returns 404', async () => {
    const res = await request(app)
      .put('/api/period-enterprises/99999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Không tìm thấy doanh nghiệp/);
  });

  /**
 * TC060 – DELETE /api/period-enterprises/:id – deletes successfully
 * Mục tiêu: Xóa doanh nghiệp và xác nhận DB không còn bản ghi đó.
 */
test('TC060 – DELETE /api/period-enterprises/:id – deletes successfully', async () => {
  // --- 1. CHUẨN BỊ (Setup) ---
  const [setup] = await pool.query(
    'INSERT INTO period_enterprises (period_id, name) VALUES (?, ?)',
    [1, 'Temp Corp To Delete']
  );
  const deleteId = setup.insertId;

  try {
    // --- 2. THỰC THI (Action) ---
    const res = await request(app)
      .delete(`/api/period-enterprises/${deleteId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/thành công/);

    // --- 3. KIỂM TRA DATABASE (CheckDB) ---
    const [rows] = await pool.query('SELECT * FROM period_enterprises WHERE id = ?', [deleteId]);
    expect(rows.length).toBe(0); // Phải bằng 0 vì đã xóa

  } finally {
    // --- 4. HOÀN TRẢ (Rollback) ---
    // Nếu chẳng may DELETE fail, ta vẫn chạy lệnh xóa này để dọn dẹp DB
    await pool.query('DELETE FROM period_enterprises WHERE id = ?', [deleteId]);
  }
});

  /**
 * TC061 – POST /api/period-enterprises – duplicate name in same period
 * Mục tiêu: Ngăn chặn trùng tên doanh nghiệp trong cùng 1 đợt.
 */
test('TC061 – POST /api/period-enterprises – duplicate name in same period returns 400', async () => {
  // --- 1. CHUẨN BỊ (Setup) ---
  const duplicateName = 'Duplicate Enterprise ' + Date.now();
  await pool.query('INSERT INTO period_enterprises (period_id, name) VALUES (?, ?)', [1, duplicateName]);

  try {
    // --- 2. THỰC THI (Action) ---
    const res = await request(app)
      .post('/api/period-enterprises')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ period_id: 1, name: duplicateName });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/đã được thêm vào đợt này/);

    // --- 3. KIỂM TRA DATABASE (CheckDB) ---
    const [rows] = await pool.query('SELECT * FROM period_enterprises WHERE name = ? AND period_id = 1', [duplicateName]);
    expect(rows.length).toBe(1); // Chỉ tồn tại 1 bản ghi (bản tạo ở setup), bản ghi post thêm không được lưu

  } finally {
    // --- 4. HOÀN TRẢ (Rollback) ---
    await pool.query('DELETE FROM period_enterprises WHERE name = ? AND period_id = 1', [duplicateName]);
  }
});

});

// ════════════════════════════════════════════════════════════════════════════
// TC062–TC073, TC087–TC088, TC090 │ internship-registrations.js
// ════════════════════════════════════════════════════════════════════════════

describe('internship-registrations.js', () => {

  // TC062 – Lấy danh sách nguyện vọng sinh viên theo đợt
  // TC062 – GET /api/internship-registrations/all?type=preferences
test('TC062 – GET /api/internship-registrations/all?type=preferences – returns 200 array', async () => {
  const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC062_P', 1]);
  const periodId = period.insertId;

  try {
    const res = await request(app)
      .get(`/api/internship-registrations/all?type=preferences&period_id=${periodId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  } finally {
    await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
  }
});

  // TC063 – Chưa có nguyện vọng nào trong đợt → mảng rỗng
  // TC063 – Mảng rỗng khi chưa có nguyện vọng
test('TC063 – GET /api/internship-registrations/all?type=preferences – empty array when no registrations', async () => {
  const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC063_P', 1]);
  const periodId = period.insertId;

  try {
    const res = await request(app)
      .get(`/api/internship-registrations/all?type=preferences&period_id=${periodId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  } finally {
    await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
  }
});

  // TC064 – Duyệt nguyện vọng – còn slot → status = approved, current_slots + 1
  // Điều kiện: sinh viên phải có đăng ký giảng viên được approved trước
  test('TC064 – Duyệt nguyện vọng thành công', async () => {
  let studentId, peId, prefId;
  
  // Tạo hậu tố ngẫu nhiên để không bao giờ bị trùng (Duplicate entry)
  const suffix = Date.now();
  const testStudentCode = `SV${suffix}`;
  const testEmail = `test${suffix}@gmail.com`;
  const testEnterpriseName = `Enterprise ${suffix}`;

  try {
    // 1. Setup: Tạo sinh viên với dữ liệu ngẫu nhiên
    const [st] = await pool.query(
      'INSERT INTO students (student_code, name, email, password_hash) VALUES (?, ?, ?, ?)', 
      [testStudentCode, 'Student Test', testEmail, 'hash']
    );
    studentId = st.insertId;
      
    // Tạo doanh nghiệp
    const [pe] = await pool.query(
      'INSERT INTO period_enterprises (period_id, name, max_slots, current_slots) VALUES (?, ?, ?, ?)', 
      [1, testEnterpriseName, 5, 0]
    );
    peId = pe.insertId;

    // Tạo nguyện vọng 
    // LƯU Ý: Sử dụng đúng tên cột trong DB của bạn (enterprise_id hoặc period_enterprise_id)
    const [pref] = await pool.query(
      'INSERT INTO student_enterprise_preferences (student_id, period_id, period_enterprise_id, preference_order, status) VALUES (?, ?, ?, ?, ?)', 
      [studentId, 1, peId, 1, 'pending']
    );
    prefId = pref.insertId;

    // --- 2. THỰC THI (Action) ---
    const res = await request(app)
      .put(`/api/internship-registrations/preference/${prefId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);

    // --- 3. KIỂM TRA (CheckDB) ---
    const [checkPref] = await pool.query('SELECT status FROM student_enterprise_preferences WHERE id = ?', [prefId]);
    expect(checkPref[0].status).toBe('approved');

    const [checkPe] = await pool.query('SELECT current_slots FROM period_enterprises WHERE id = ?', [peId]);
    expect(checkPe[0].current_slots).toBe(1);

  } finally {
    // --- 4. HOÀN TRẢ TRẠNG THÁI (Rollback) ---
    // Xóa dữ liệu rác để DB luôn sạch sau mỗi lần chạy
    if (prefId) await pool.query('DELETE FROM student_enterprise_preferences WHERE id = ?', [prefId]);
    if (peId) await pool.query('DELETE FROM period_enterprises WHERE id = ?', [peId]);
    if (studentId) await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
  }
});

  //TC065 Duyệt nguyện vọng – doanh nghiệp đã đầy slot 
  test('TC065 – PUT preference/:id/status – enterprise full returns 400', async () => {
  let studentId;
  let periodId;
  let peId;
  let prefId;

  try {
    // 1. Tạo kỳ thực tập
    const [period] = await pool.query(
      `INSERT INTO internship_periods (name, start_date, end_date, is_active, description)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'TC065 Period',
        '2026-06-01 00:00:00',
        '2026-08-31 23:59:59',
        1,
        'Test period for TC065'
      ]
    );
    periodId = period.insertId;

    // 2. Tạo student
    const unique = Date.now();
    const [student] = await pool.query(
      `INSERT INTO students
        (student_code, name, email, password_hash, phone, class_name, date_of_birth, gpa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `TC065_${unique}`,
        'TC065 Student',
        `tc065_${unique}@example.com`,
        'hashed_password_for_test',
        '0900000000',
        'SE1701',
        '2004-01-01',
        3.2
      ]
    );
    studentId = student.insertId;

    // 3. Tạo doanh nghiệp đã full slot
    const [pe] = await pool.query(
      `INSERT INTO period_enterprises (period_id, name, max_slots, current_slots)
       VALUES (?, ?, ?, ?)`,
      [periodId, 'Full Corp', 2, 2]
    );
    peId = pe.insertId;

    // 4. Tạo preference pending
    const [pref] = await pool.query(
      `INSERT INTO student_enterprise_preferences
        (student_id, period_enterprise_id, preference_order, status)
       VALUES (?, ?, ?, ?)`,
      [studentId, peId, 1, 'pending']
    );
    prefId = pref.insertId;

    // 5. Gọi API
    const res = await request(app)
      .put(`/api/internship-registrations/preference/${prefId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/hết slot/i);
  } finally {
    if (prefId) {
      await pool.query('DELETE FROM student_enterprise_preferences WHERE id = ?', [prefId]);
    }
    if (peId) {
      await pool.query('DELETE FROM period_enterprises WHERE id = ?', [peId]);
    }
    if (studentId) {
      await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
    }
    if (periodId) {
      await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
    }
  }
});

  // TC066 – Từ chối nguyện vọng → status = rejected, slots không đổi
test('TC066 – PUT preference/:id/status – reject → status rejected, slots unchanged', async () => {
  let prefId;
  let peId;

  try {
    // --- 1. CHUẨN BỊ (Setup) ---
    const studentName = 'TC066_' + Date.now();
    const [student] = await pool.query(
      `INSERT INTO students (student_code, name, email, password_hash) 
       VALUES (?, ?, ?, ?)`,
      [studentName, studentName, `${studentName}@test.com`, 'hash']
    );
    const studentId = student.insertId;

    const [period] = await pool.query(
      `INSERT INTO internship_periods (name, start_date, end_date, is_active) 
       VALUES (?, ?, ?, ?)`,
      ['TC066_Period', '2026-06-01', '2026-08-31', 1]
    );
    const periodId = period.insertId;

    const [pe] = await pool.query(
      `INSERT INTO period_enterprises (period_id, name, max_slots, current_slots) 
       VALUES (?, ?, ?, ?)`,
      [periodId, 'Corp TC066', 5, 0]
    );
    peId = pe.insertId;

    const [pref] = await pool.query(
      `INSERT INTO student_enterprise_preferences 
       (student_id, period_id, period_enterprise_id, preference_order, status)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, periodId, peId, 1, 'pending']
    );
    prefId = pref.insertId;

    // --- 2. THỰC THI (Action) ---
    const res = await request(app)
      .put(`/api/internship-registrations/preference/${prefId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);

    // --- 3. KIỂM TRA DATABASE (CheckDB) ---
    const [checkPref] = await pool.query(
      'SELECT status FROM student_enterprise_preferences WHERE id = ?', [prefId]
    );
    expect(checkPref[0].status).toBe('rejected');

    const [checkPE] = await pool.query(
      'SELECT current_slots FROM period_enterprises WHERE id = ?', [peId]
    );
    expect(checkPE[0].current_slots).toBe(0); // Không đổi

  } finally {
    // --- 4. HOÀN TRẢ (Rollback) ---
    if (prefId) {
      await pool.query('DELETE FROM student_enterprise_preferences WHERE id = ?', [prefId]);
    }
    if (peId) {
      await pool.query('DELETE FROM period_enterprises WHERE id = ?', [peId]);
    }
    await pool.query('DELETE FROM students WHERE student_code LIKE "TC066_%"');
    await pool.query('DELETE FROM internship_periods WHERE name = "TC066_Period"');
  }
});

  // TC067 – ID nguyện vọng không tồn tại → 404
  test('TC067 – PUT preference/:id/status – non-existent ID returns 404', async () => {
    const res = await request(app)
      .put('/api/internship-registrations/preference/99999/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Không tìm thấy nguyện vọng/);
  });

 // TC068 – Duyệt với intern_at_academy = true → phân về doanh nghiệp HVBCVT
test('TC068 – PUT preference/:id/status – intern_at_academy:true routes to HVBCVT enterprise', async () => {
  let prefId;
  let hvbcvtId;

  try {
    // --- 1. CHUẨN BỊ (Setup) ---
    const studentName = 'TC068_' + Date.now();
    const [student] = await pool.query(
      `INSERT INTO students (student_code, name, email, password_hash) 
       VALUES (?, ?, ?, ?)`,
      [studentName, studentName, `${studentName}@test.com`, 'hash']
    );
    const studentId = student.insertId;

    const [period] = await pool.query(
      `INSERT INTO internship_periods (name, start_date, end_date, is_active) 
       VALUES (?, ?, ?, ?)`,
      ['TC068_Period', '2026-06-01', '2026-08-31', 1]
    );
    const periodId = period.insertId;

    const [peRegular] = await pool.query(
      `INSERT INTO period_enterprises (period_id, name, max_slots, current_slots) 
       VALUES (?, ?, ?, ?)`,
      [periodId, 'Corp Regular TC068', 5, 0]
    );
    const peRegularId = peRegular.insertId;

    const [hvbcvt] = await pool.query(
      `INSERT INTO period_enterprises (period_id, name, max_slots, current_slots) 
       VALUES (?, ?, ?, ?)`,
      [periodId, 'Học viện Công nghệ Bưu chính Viễn thông', 50, 0]
    );
    hvbcvtId = hvbcvt.insertId;

    const [pref] = await pool.query(
      `INSERT INTO student_enterprise_preferences 
       (student_id, period_id, period_enterprise_id, preference_order, status)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, periodId, peRegularId, 1, 'pending']
    );
    prefId = pref.insertId;

    // --- 2. THỰC THI (Action) ---
    const res = await request(app)
      .put(`/api/internship-registrations/preference/${prefId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved', intern_at_academy: true });

    expect(res.status).toBe(200);

    // --- 3. KIỂM TRA DATABASE (CheckDB) ---
    const [hvPref] = await pool.query(
      `SELECT status FROM student_enterprise_preferences
       WHERE student_id = ? AND period_enterprise_id = ?`,
      [studentId, hvbcvtId]
    );
    expect(hvPref.length).toBeGreaterThan(0);
    expect(hvPref[0].status).toBe('approved');

  } finally {
    // --- 4. HOÀN TRẢ (Rollback) ---
    if (prefId) {
      await pool.query('DELETE FROM student_enterprise_preferences WHERE student_id IN (SELECT id FROM students WHERE student_code LIKE "TC068_%")');
    }
    await pool.query('DELETE FROM period_enterprises WHERE period_id IN (SELECT id FROM internship_periods WHERE name = "TC068_Period")');
    await pool.query('DELETE FROM students WHERE student_code LIKE "TC068_%"');
    await pool.query('DELETE FROM internship_periods WHERE name = "TC068_Period"');
  }
});

  // TC069 – Lấy kết quả xét duyệt – nhóm theo giảng viên (mặc định)
test('TC069 – GET /api/internship-registrations/results – default returns lecturers list', async () => {
  const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC069_P', 1]);
  const periodId = period.insertId;

  try {
    const res = await request(app)
      .get(`/api/internship-registrations/results?period_id=${periodId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  } finally {
    await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
  }
});

  // TC070 – Lấy kết quả xét duyệt – nhóm theo doanh nghiệp
test('TC070 – GET /api/internship-registrations/results?type=enterprises – returns enterprises list', async () => {
  const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC070_P', 1]);
  const periodId = period.insertId;

  try {
    const res = await request(app)
      .get(`/api/internship-registrations/results?period_id=${periodId}&type=enterprises`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  } finally {
    await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
  }
});

  // TC071 – Sinh viên xem nguyện vọng của chính mình
test('TC071 – GET /api/internship-registrations/my-preferences – student gets own preferences', async () => {
  const studentId = await seedStudent(pool, 'B99TC071');
  const studentTk = jwt.sign({ id: studentId, role: 'student' }, JWT_SECRET, { expiresIn: '1h' });
  const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC071_P', 1]);
  const periodId = period.insertId;
  const peId = await seedEnterprise(pool, periodId, 'Corp TC071');
  await seedPreference(pool, studentId, peId, 1, 'pending');

  try {
    const res = await request(app)
      .get(`/api/internship-registrations/my-preferences?period_id=${periodId}`)
      .set('Authorization', `Bearer ${studentTk}`);
    expect(res.status).toBe(200);
    expect(res.body[0].preference_order).toBe(1);
  } finally {
    await pool.query('DELETE FROM student_enterprise_preferences WHERE student_id = ?', [studentId]);
    await pool.query('DELETE FROM period_enterprises WHERE period_id = ?', [periodId]);
    await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
    await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
  }
});

  // TC072 – Duyệt lại nguyện vọng đã approved → slots không tăng thêm
test('TC072 – PUT preference/:id/status – re-approve does not double-increment slots', async () => {
  let prefId;
  let peId;

  try {
    // --- 1. CHUẨN BỊ (Setup) ---
    const studentName = 'TC072_' + Date.now();
    const [student] = await pool.query(
      `INSERT INTO students (student_code, name, email, password_hash) 
       VALUES (?, ?, ?, ?)`,
      [studentName, studentName, `${studentName}@test.com`, 'hash']
    );
    const studentId = student.insertId;

    const [period] = await pool.query(
      `INSERT INTO internship_periods (name, start_date, end_date, is_active) 
       VALUES (?, ?, ?, ?)`,
      ['TC072_Period', '2026-06-01', '2026-08-31', 1]
    );
    const periodId = period.insertId;

    const [pe] = await pool.query(
      `INSERT INTO period_enterprises (period_id, name, max_slots, current_slots) 
       VALUES (?, ?, ?, ?)`,
      [periodId, 'Corp TC072', 5, 1] // current_slots = 1 sẵn
    );
    peId = pe.insertId;

    const [pref] = await pool.query(
      `INSERT INTO student_enterprise_preferences 
       (student_id, period_id, period_enterprise_id, preference_order, status)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, periodId, peId, 1, 'approved'] // Đã approved sẵn
    );
    prefId = pref.insertId;

    // --- 2. THỰC THI (Action) ---
    const res = await request(app)
      .put(`/api/internship-registrations/preference/${prefId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);

    // --- 3. KIỂM TRA DATABASE (CheckDB) ---
    const [checkPE] = await pool.query(
      'SELECT current_slots FROM period_enterprises WHERE id = ?', [peId]
    );
    expect(checkPE[0].current_slots).toBe(1); // VẪN = 1, không tăng

  } finally {
    // --- 4. HOÀN TRẢ (Rollback) ---
    if (prefId) {
      await pool.query('DELETE FROM student_enterprise_preferences WHERE id = ?', [prefId]);
    }
    if (peId) {
      await pool.query('DELETE FROM period_enterprises WHERE id = ?', [peId]);
    }
    await pool.query('DELETE FROM students WHERE student_code LIKE "TC072_%"');
    await pool.query('DELETE FROM internship_periods WHERE name = "TC072_Period"');
  }
});

  // TC073 – Xuất danh sách kết quả theo doanh nghiệp cụ thể → file .xlsx
test('TC073 – GET /api/internship-registrations/results/export?enterprise_id – returns xlsx file', async () => {
  const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC073_P', 1]);
  const periodId = period.insertId;
  const peId = await seedEnterprise(pool, periodId, 'Export Corp');
  const studentId = await seedStudent(pool, 'B99TC073');
  await seedPreference(pool, studentId, peId, 1, 'approved');
  await pool.query('UPDATE period_enterprises SET current_slots = 1 WHERE id = ?', [peId]);

  try {
    const res = await request(app)
      .get(`/api/internship-registrations/results/export?period_id=${periodId}&enterprise_id=${peId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  } finally {
    await pool.query('DELETE FROM student_enterprise_preferences WHERE student_id = ?', [studentId]);
    await pool.query('DELETE FROM period_enterprises WHERE period_id = ?', [periodId]);
    await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
    await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
  }
});

  // TC087 – Xuất danh sách kết quả theo giảng viên → file .xlsx
  // Dùng lecturer_period_id (FK tới lecturer_periods) thay vì lecturer_id trực tiếp
  // TC087 – Xuất danh sách kết quả theo giảng viên
  test('TC087 – GET /api/internship-registrations/results/export?lecturer_id – returns xlsx for lecturer', async () => {
  // Tạo code duy nhất mỗi lần chạy test
  const uniqueCode = 'GV_TC087_' + Date.now(); 
  
  const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC087_P', 1]);
  const periodId = period.insertId;
  
  // Truyền uniqueCode vào hàm seed
  const { lecturerId, lecturerPeriodId } = await seedLecturerPeriod(pool, periodId, uniqueCode);
  const studentId = await seedStudent(pool, 'B99TC087_' + Date.now()); // Cũng nên làm unique
  await seedLecturerReg(pool, studentId, lecturerPeriodId);

  try {
    const res = await request(app)
      .get(`/api/internship-registrations/results/export?period_id=${periodId}&lecturer_id=${lecturerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  } finally {
    // Xóa theo uniqueCode
    await pool.query('DELETE FROM student_lecturer_registrations WHERE student_id = ?', [studentId]);
    await pool.query('DELETE FROM lecturer_periods WHERE period_id = ?', [periodId]);
    await pool.query('DELETE FROM lecturers WHERE id = ?', [lecturerId]);
    await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
    await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
  }
});

  // TC088 – Xuất danh sách kết quả tất cả doanh nghiệp → file .xlsx
  test('TC088 – GET /api/internship-registrations/results/export?type=enterprises – returns xlsx workbook', async () => {
    const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC088_P', 1]);
    const periodId = period.insertId;
    const peId = await seedEnterprise(pool, periodId, 'Exp Corp 88');
    const studentId = await seedStudent(pool, 'B99TC088');
    await seedPreference(pool, studentId, peId, 1, 'approved');
    await pool.query('UPDATE period_enterprises SET current_slots = 1 WHERE id = ?', [peId]);

    try {
      const res = await request(app)
        .get(`/api/internship-registrations/results/export?period_id=${periodId}&type=enterprises`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('spreadsheetml');
    } finally {
      await pool.query('DELETE FROM student_enterprise_preferences WHERE student_id = ?', [studentId]);
      await pool.query('DELETE FROM period_enterprises WHERE period_id = ?', [periodId]);
      await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
      await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
    }
});

  // TC090 – Không có token xác thực → 401
  test('TC090 – PUT preference/:id/status – no auth token returns 401', async () => {
    const res = await request(app)
      .put('/api/internship-registrations/preference/1/status')
      .send({ status: 'approved' });
    // Không có header Authorization

    expect(res.status).toBe(401);
  });

});

// ════════════════════════════════════════════════════════════════════════════
// TC074–TC086 │ students.js
// ════════════════════════════════════════════════════════════════════════════

describe('students.js', () => {

  // TC074 – Tìm sinh viên theo mã
  test('TC074 – GET /api/students?q=B21 – returns matching students', async () => {
    const res = await request(app)
      .get('/api/students?q=B21')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const body = res.body.data !== undefined ? res.body.data : res.body;
    expect(Array.isArray(body)).toBe(true);
  });

  // TC075 – POST /api/students/register – valid data returns 201
  test('TC075 – POST /api/students/register – valid data returns 201 with hashed password', async () => {
    const validStudentPayload = {
      student_code: 'B99TC075', name: 'Nguyen Test A', email: 'tc075@ptit.edu.vn',
      password: 'pass123', phone: '0900000075', major_id: 1,
      class_name: 'D22TEST', date_of_birth: '2003-01-15', gpa: 3.5,
    };
    try {
      const res = await request(app)
          .post('/api/students/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validStudentPayload);
      expect(res.status).toBe(201);
      const [rows] = await pool.query('SELECT password_hash FROM students WHERE student_code = ?', ['B99TC075']);
      expect(rows[0].password_hash.startsWith('$2')).toBe(true);
    } finally {
      await pool.query('DELETE FROM students WHERE student_code = ?', ['B99TC075']);
    }
  });

  // TC076 – Tạo sinh viên – thiếu trường 'name' → 400
  test("TC076 – POST /api/students/register – missing 'name' returns 400 validation error", async () => {
    const res = await request(app)
      .post('/api/students/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_code: 'B99TC076',
        email: 'tc076@ptit.edu.vn',
        password: 'pass123',
        phone: '0900000076',
        major_id: 1,
        class_name: 'D22TEST',
        date_of_birth: '2003-01-15',
        // name bị bỏ
      });

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/Tên là bắt buộc/);
  });

  // TC077 – Tạo sinh viên – email trùng → 409
  test('TC077 – POST /api/students/register – duplicate email returns 409', async () => {
    // Tạo unique code để tránh trùng lặp
    const uniqueId = Date.now();
    const studentCode = `B99EXISTING_${uniqueId}`;
    const duplicateEmail = `duplicate_${uniqueId}@ptit.edu.vn`;

    // Seed sinh viên với email và mã duy nhất
    await pool.query(
        'INSERT INTO students (student_code, name, email, password_hash, phone, class_name, date_of_birth, gpa, major_id) VALUES (?,?,?,?,?,?,?,?,?)',
        [studentCode, 'Existing Student', duplicateEmail, 'hash', '0900000001', 'D22', '2003-01-01', 3.5, 1]
    );

    try {
      const res = await request(app)
          .post('/api/students/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            student_code: `B99TC077_${uniqueId}`, // Code mới
            name: 'Nguyen C',
            email: duplicateEmail, // Email bị trùng với bản ghi đã seed phía trên
            password: 'pass123',
            phone: '0900000077',
            major_id: 1,
            class_name: 'D22TEST',
            date_of_birth: '2003-01-15',
          });

      expect(res.status).toBe(409);
      expect(res.body.error || res.body.message).toMatch(/Email đã tồn tại/);
    } finally {
      // Dọn dẹp cả 2 bản ghi
      await pool.query('DELETE FROM students WHERE student_code IN (?, ?)',
          [studentCode, `B99TC077_${uniqueId}`]);
    }
  });

  // TC078 – Cập nhật thông tin sinh viên – hợp lệ
  test('TC078 – PUT /api/students/:id – valid update returns 200', async () => {
    const svId = await seedStudent(pool, 'B99TC078');
    try {
      const res = await request(app)
          .put(`/api/students/${svId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ gpa: 3.8, phone: '0999888778' });
      expect(res.status).toBe(200);
      const [rows] = await pool.query('SELECT gpa, phone FROM students WHERE id = ?', [svId]);
      expect(parseFloat(rows[0].gpa)).toBe(3.8);
    } finally {
      await pool.query('DELETE FROM students WHERE id = ?', [svId]);
    }
  });

  // TC079 – Xóa sinh viên – chưa có đăng ký approved
  test('TC079 – DELETE /api/students/:id – no approved regs → 204 No Content', async () => {
    const svId = await seedStudent(pool, 'B99TC079');
    try {
      const res = await request(app)
          .delete(`/api/students/${svId}`)
          .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(204);
    } finally {
      await pool.query('DELETE FROM students WHERE id = ?', [svId]);
    }
  });

  // TC080 – Không cho xóa sinh viên đã có đăng ký approved → 409 Conflict
test('TC080 – DELETE /api/students/:id – has approved regs → 409 Conflict', async () => {
  const uniqueId = Date.now();

  // 1. Setup dữ liệu
  const [period] = await pool.query(
    'INSERT INTO internship_periods (name, is_active) VALUES (?, ?)',
    [`TC080_P_${uniqueId}`, 1]
  );
  const periodId = period.insertId;

  const peId = await seedEnterprise(pool, periodId, `Corp TC080_${uniqueId}`);
  const svId = await seedStudent(pool, `B99TC080_${uniqueId}`);

  const { lecturerPeriodId } = await seedLecturerPeriod(pool, periodId, `GV_TC080_${uniqueId}`);
  await seedLecturerReg(pool, svId, lecturerPeriodId);
  await seedPreference(pool, svId, peId, 1, 'approved');

  try {
    // 2. Action: Gọi API DELETE
    const res = await request(app)
      .delete(`/api/students/${svId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    // 3. Expect: không cho xóa
    expect(res.status).toBe(409);
    expect(res.body.error || res.body.message).toMatch(/không thể xóa|đã có đăng ký|approved/i);

    // 4. CheckDB: sinh viên vẫn còn, slot không đổi
    const [studentRows] = await pool.query('SELECT id FROM students WHERE id = ?', [svId]);
    expect(studentRows.length).toBe(1);

    const [pe] = await pool.query('SELECT current_slots FROM period_enterprises WHERE id = ?', [peId]);
    expect(pe[0].current_slots).toBe(1);

    const [lp] = await pool.query('SELECT current_slots FROM lecturer_periods WHERE id = ?', [lecturerPeriodId]);
    expect(lp[0].current_slots).toBe(1);
  } finally {
    // 5. Cleanup
    await pool.query('DELETE FROM student_enterprise_preferences WHERE student_id = ?', [svId]);
    await pool.query('DELETE FROM student_lecturer_registrations WHERE student_id = ?', [svId]);
    await pool.query('DELETE FROM students WHERE id = ?', [svId]);
    await pool.query('DELETE FROM period_enterprises WHERE id = ?', [peId]);
    await pool.query('DELETE FROM lecturer_periods WHERE id = ?', [lecturerPeriodId]);
    await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
  }
});

  // TC081 – Import sinh viên từ Excel – 3 dòng hợp lệ → successCount: 3
  // Tên cột Excel phải khớp với mapping trong API import
  // major_id được tra cứu từ majors.name, ví dụ 'Công nghệ thông tin' → major_id = 2
  test('TC081 – POST /api/students/import-excel – 3 valid rows', async () => {
    // Thay vì ghi file, dùng buffer để gửi thẳng cho API
    const templateData = [
      {
        'mã sinh viên': 'B99IMP001',
        'họ và tên': 'Import Student A',
        'email': 'imp001@test.com',
        'số điện thoại': '0911000001',
        'lớp': 'D22',
        'ngành học': 'Công nghệ thông tin',
        'ngày sinh': '01/01/2003',
        'gpa': '3.5',
        'mật khẩu': '123'
      },
      {
        'mã sinh viên': 'B99IMP002',
        'họ và tên': 'Import Student B',
        'email': 'imp002@test.com',
        'số điện thoại': '0911000002',
        'lớp': 'D22',
        'ngành học': 'Công nghệ thông tin',
        'ngày sinh': '01/01/2003',
        'gpa': '3.6',
        'mật khẩu': '123'
      },
      {
        'mã sinh viên': 'B99IMP003',
        'họ và tên': 'Import Student C',
        'email': 'imp003@test.com',
        'số điện thoại': '0911000003',
        'lớp': 'D22',
        'ngành học': 'Công nghệ thông tin',
        'ngày sinh': '01/01/2003',
        'gpa': '3.7',
        'mật khẩu': '123'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sinh viên');

    // Ghi ra buffer thay vì đường dẫn file
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    try {
      const res = await request(app)
          .post('/api/students/import-excel')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('file', buffer, 'test.xlsx'); // Gửi buffer như 1 file đính kèm

      expect(res.status).toBe(200);
      // Nếu vẫn trả về 0, hãy log res.body ra để xem API báo lỗi gì
      console.log('API Response Body:', res.body);
      expect(res.body.data.successCount).toBe(3);
    } finally {
      await pool.query("DELETE FROM students WHERE student_code IN ('B99IMP001','B99IMP002','B99IMP003')");
    }
  });


  // TC082 – Import Excel – 1 dòng thiếu mã sinh viên → partial import (1 thành công, 1 lỗi)
  test('TC082 – POST /api/students/import-excel – row missing student_code → partial import', async () => {
    const templateData = [
      {
        'mã sinh viên': 'B99IMP011',
        'họ và tên': 'Valid Student',
        'email': 'imp011@ptit.edu.vn',
        'số điện thoại': '0911000011',
        'lớp': 'D22IMPORT',
        'ngành học': 'Công nghệ thông tin', // Đảm bảo tên này khớp với DB
        'ngày sinh': '01/01/2003',
        'gpa': '3.5',
        'mật khẩu': 'B99IMP011',
      },
      {
        'mã sinh viên': '', // Thiếu mã -> Lỗi
        'họ và tên': 'Invalid Student',
        'email': 'imp012@ptit.edu.vn',
        'số điện thoại': '0911000012',
        'lớp': 'D22IMPORT',
        'ngành học': 'Công nghệ thông tin',
        'ngày sinh': '02/01/2003',
        'gpa': '3.5',
        'mật khẩu': 'B99IMP012',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sinh viên');

    // Dùng buffer thay vì ghi file vào ổ cứng
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    try {
      const res = await request(app)
          .post('/api/students/import-excel')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('file', buffer, 'test_tc082.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.data.successCount).toBe(1);
      expect(res.body.data.errorCount).toBe(1);
      // Kiểm tra thông báo lỗi của dòng thứ 2
      expect(res.body.data.errors[0].error).toMatch(/Thiếu mã sinh viên/i);

    } finally {
      // Dọn dẹp bản ghi thành công
      await pool.query("DELETE FROM students WHERE student_code = 'B99IMP011'");
    }
  });

  // TC083 – Tìm sinh viên theo tên
  test("TC083 – GET /api/students?q=Nguyen – returns students matching 'Nguyen'", async () => {
    const res = await request(app)
      .get('/api/students?q=Nguyen')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const body = res.body.data !== undefined ? res.body.data : res.body;
    expect(Array.isArray(body)).toBe(true);
  });

  // TC084 – Tìm sinh viên không tồn tại → mảng rỗng
  test('TC084 – GET /api/students?q=ZZNOTEXIST – returns empty array', async () => {
    const res = await request(app)
      .get('/api/students?q=ZZNOTEXIST_XYZ_12345')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const body = res.body.data !== undefined ? res.body.data : res.body;
    expect(body).toEqual([]);
  });

  // TC085 – Lấy sinh viên theo ID
  test('TC085 – GET /api/students/:id – existing ID returns student object', async () => {
    const svId = await seedStudent(pool, 'B99TC085');
    try {
      const res = await request(app).get(`/api/students/${svId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    } finally {
      await pool.query('DELETE FROM students WHERE id = ?', [svId]);
    }
  });

  // TC086 – Lấy sinh viên theo ID không tồn tại → 404
  test('TC086 – GET /api/students/:id – non-existent ID returns 404', async () => {
    const res = await request(app)
      .get('/api/students/99999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error || res.body.message).toMatch(/Không tìm thấy sinh viên/);
  });

  // TC089 – Import doanh nghiệp từ Excel
  test('TC089 – POST /api/period-enterprises/import – 2 valid rows → success:2', async () => {
    const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC089_P', 1]);
    const pId = period.insertId;

    // Cấu trúc dữ liệu phải khớp với các key mà controller của bạn dùng:
    // 'Tên doanh nghiệp', 'Mô tả công việc', 'Địa chỉ', 'Thông tin liên hệ', 'Số slot tối đa', 'Đang hoạt động'
    const enterpriseData = [
      {
        'Tên doanh nghiệp': 'Import Corp A',
        'Mô tả công việc': 'Backend Dev',
        'Địa chỉ': 'Hà Nội',
        'Thông tin liên hệ': 'hr@impa.com',
        'Số slot tối đa': 5,
        'Đang hoạt động': 'Có',
      },
      {
        'Tên doanh nghiệp': 'Import Corp B',
        'Mô tả công việc': 'Frontend Dev',
        'Địa chỉ': 'TP. Hồ Chí Minh',
        'Thông tin liên hệ': 'hr@impb.com',
        'Số slot tối đa': 8,
        'Đang hoạt động': 'Có',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(enterpriseData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Doanh nghiệp');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    try {
      const res = await request(app)
          .post('/api/period-enterprises/import')
          .set('Authorization', `Bearer ${adminToken}`)
          .field('period_id', pId) // Gửi period_id ở đây
          .attach('file', buffer, 'test_import.xlsx');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(2);
      expect(res.body.failed).toBe(0);

      // CheckDB
      const [rows] = await pool.query(
          "SELECT id FROM period_enterprises WHERE period_id = ? AND name IN ('Import Corp A','Import Corp B')",
          [pId]
      );
      expect(rows.length).toBe(2);
    } finally {
      await pool.query('DELETE FROM period_enterprises WHERE period_id = ?', [pId]);
      await pool.query('DELETE FROM internship_periods WHERE id = ?', [pId]);
    }
  });
  //TC090 - Chech Auth
  test('TC090 – PUT preference/:id/status – no auth token returns 401', async () => {
    // 1. Setup: Tạo dữ liệu cần thiết (cần ID để gọi API)
    const [period] = await pool.query('INSERT INTO internship_periods (name, is_active) VALUES (?, ?)', ['TC090_P', 1]);
    const periodId = period.insertId;
    const peId = await seedEnterprise(pool, periodId, 'Corp TC090', 5);
    const svId = await seedStudent(pool, 'B99TC090');
    const prefId = await seedPreference(pool, svId, peId, 1, 'pending');

    try {
      // 2. Action: Gọi API MÀ KHÔNG CÓ Header Authorization
      const res = await request(app)
          .put(`/api/internship-registrations/preference/${prefId}/status`)
          .send({ status: 'approved' }); // Không set .set('Authorization', ...)

      // 3. Assert
      expect(res.status).toBe(401); // Mong đợi 401 Unauthorized
    } finally {
      // 4. Rollback
      await pool.query('DELETE FROM student_enterprise_preferences WHERE id = ?', [prefId]);
      await pool.query('DELETE FROM period_enterprises WHERE id = ?', [peId]);
      await pool.query('DELETE FROM students WHERE id = ?', [svId]);
      await pool.query('DELETE FROM internship_periods WHERE id = ?', [periodId]);
    }
  });
});