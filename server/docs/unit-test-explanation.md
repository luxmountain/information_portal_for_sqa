# Giải thích Code Unit Test – Cao Sơn (Content Management)

> Files: `setup.js` | `admissions.test.js` | `auth-middleware.test.js`
> Framework: Jest + Supertest | DB: MySQL (real database, không mock)

---

## 1. `__tests__/setup.js` — File cấu hình dùng chung

File này là **nền tảng** mà mọi file test đều `require('../setup')`. Cung cấp 5 thành phần chính:

### 1.1. Kết nối Database

```js
require('dotenv').config({ path: resolve(__dirname, '../.env') });
const pool = require('../src/config/db');
```

- Load biến môi trường từ `.env` (DB host, user, password...)
- Tạo MySQL **connection pool** dùng chung cho tất cả test
- Dùng để: **CheckDB** (query kiểm tra dữ liệu) và **Rollback** (xóa dữ liệu test)

### 1.2. JWT Token giả

```js
const ADMIN_TOKEN = generateToken({ id: 99999, role: 'admin', ... });
const STUDENT_TOKEN = generateToken({ id: 99998, role: 'student', ... });
```

- Tạo 2 token JWT bằng **đúng secret key** của server (`JWT_SECRET` từ `.env`)
- `ADMIN_TOKEN` (role: `admin`) → được phép thực hiện CRUD
- `STUDENT_TOKEN` (role: `student`) → bị middleware chặn, trả 403
- **Không cần login thật** — chỉ cần sign JWT đúng secret là server chấp nhận

### 1.3. `createCrudApp(mountPath, options)` — Tạo Express app mini

```js
const createCrudApp = (mountPath, options) => {
  const app = express();
  app.use(express.json());                              // Parse JSON body
  app.use(mountPath, buildCrudRouter({ ...options, authGuard })); // Gắn CRUD router
  app.use(errorHandler);                                // Xử lý lỗi
  return app;
};
```

- Tạo 1 Express app **chỉ có 1 route** (ví dụ `/api/admissions`)
- Supertest gửi request vào app này **không cần start server trên port**
- Mỗi file test tạo app riêng → **test độc lập**, không ảnh hưởng nhau
- `buildCrudRouter` là hàm `crudFactory.js` — tự động tạo GET/POST/PUT/DELETE

### 1.4. `createCustomApp(mountPath, router)` — Cho route tự viết

```js
const createCustomApp = (mountPath, router) => {
  const app = express();
  app.use(express.json());
  app.use(mountPath, router);
  app.use(errorHandler);
  return app;
};
```

- Tương tự `createCrudApp` nhưng dùng cho route **viết tay** (departments.js, majors.js)
- Thay vì truyền options cho crudFactory, truyền thẳng Express Router đã require

### 1.5. Rollback Helpers

```js
const rollbackTable = async (tableName) => {
  await pool.query(`DELETE FROM ${tableName}`);
};
```

- Xóa **toàn bộ** dữ liệu trong bảng sau khi test xong
- Gọi trong `afterAll()` → DB sạch, chạy lại không bị conflict dữ liệu cũ

---

## 2. `admissions.test.js` — Test CRUD tuyển sinh (TC139–TC140)

### Cấu trúc file

```js
// Import từ setup.js
const { pool, ADMIN_TOKEN, createCrudApp, rollbackTable } = require('../setup');

// Tạo app mini cho /api/admissions
const admissionsApp = createCrudApp('/api/admissions', {
  tableName: 'admissions',
  searchableFields: ['admission_year', 'description'],
});

let createdAdmissionId;  // Lưu ID bản ghi tạo bởi test

// Sau khi TẤT CẢ test chạy xong → xóa sạch bảng admissions
afterAll(async () => {
  await rollbackTable('admissions');
});
```

### TC139 — Tạo tin tuyển sinh hợp lệ

**Loại:** Standard | **CheckDB:** ✓ | **Rollback:** ✓

```js
it('should return 201 and persist admission to database', async () => {
  // 1. Chuẩn bị dữ liệu đầu vào
  const validAdmissionPayload = {
    title: 'Tuyển sinh 2025 TC139',
    admission_year: 2025,
    description: 'Mô tả tuyển sinh',
  };

  // 2. Gửi POST request với admin token
  const response = await request(admissionsApp)
    .post('/api/admissions')
    .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
    .send(validAdmissionPayload);

  // 3. Kiểm tra HTTP response
  expect(response.status).toBe(201);          // 201 Created
  expect(response.body).toHaveProperty('id');  // Response có id

  // 4. Lưu ID để dùng cho rollback
  createdAdmissionId = response.body.id;

  // 5. CheckDB: query trực tiếp MySQL xác nhận dữ liệu đã lưu đúng
  const [dbRows] = await pool.query(
    'SELECT * FROM admissions WHERE id = ?',
    [createdAdmissionId]
  );
  expect(dbRows).toHaveLength(1);              // Đúng 1 bản ghi
  expect(dbRows[0].admission_year).toBe(2025); // Giá trị đúng
});
```

**Flow:** Gửi request → kiểm tra response → kiểm tra DB thật → afterAll xóa sạch.

### TC140 — Thiếu title (Exception test)

**Loại:** Exception | **CheckDB:** ✗ | **Rollback:** ✗

```js
it('should reject when title is missing (NOT NULL constraint)', async () => {
  // Gửi POST thiếu title (title là NOT NULL trong DB)
  const missingTitlePayload = { admission_year: 2025 };

  const response = await request(admissionsApp)
    .post('/api/admissions')
    .set('Authorization', `Bearer ${ADMIN_TOKEN}`)
    .send(missingTitlePayload);

  // MySQL strict mode → ER_NO_DEFAULT_FOR_FIELD → server trả 500
  expect(response.status).toBe(500);
});
```

- Không cần CheckDB vì **không có gì được insert** vào DB
- Không cần Rollback vì không tạo dữ liệu mới
- Server không có validation layer riêng → lỗi do MySQL constraint → HTTP 500

---

## 3. `auth-middleware.test.js` — Test phân quyền (TC135–TC136)

### Cấu trúc file

```js
const { STUDENT_TOKEN, createCrudApp } = require('../setup');

// Dùng /api/news làm đại diện — bất kỳ crudFactory route nào cũng có auth
const authTestApp = createCrudApp('/api/news', {
  tableName: 'news',
  searchableFields: ['title'],
});
```

- Không cần `pool` hay `rollbackTable` vì **không tạo dữ liệu** (request bị chặn trước khi đến DB)
- Chọn `/api/news` làm đại diện — tất cả crudFactory route đều dùng chung middleware auth

### TC135 — Không có token → 401

**Loại:** Exception | **Mục đích:** Kiểm tra middleware `auth.js`

```js
it('should return 401 when Authorization header is missing', async () => {
  // Gửi POST mà KHÔNG set Authorization header
  const response = await request(authTestApp)
    .post('/api/news')
    .send({ title: 'Test without token' });

  expect(response.status).toBe(401);
  expect(response.body.message).toBe('Authorization header missing');
});
```

**Flow bên trong server:**
```
Request → auth.js middleware → không có header Authorization → trả 401 ngay
                               (không bao giờ đến route handler)
```

### TC136 — Student token → 403

**Loại:** Exception | **Mục đích:** Kiểm tra `adminGuard` trong crudFactory `protect()`

```js
it('should return 403 when using student token on admin endpoint', async () => {
  // Gửi POST với token student (role: 'student')
  const response = await request(authTestApp)
    .post('/api/news')
    .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
    .send({ title: 'Test with student token' });

  expect(response.status).toBe(403);
  expect(response.body.message).toBe('Forbidden: Admin access required');
});
```

**Flow bên trong server:**
```
Request → auth.js middleware → có token, verify JWT thành công
        → adminGuard (protect()) → role = 'student' ≠ 'admin' → trả 403
                                   (không bao giờ đến DB)
```

---

## Tổng kết Flow chạy test

```
setup.js tạo sẵn: pool, token, app factory, rollback
         │
         ▼
test file require setup
         │
         ▼
tạo Express app mini (không cần start server)
         │
         ▼
supertest gửi HTTP request vào app
         │
         ├── Kiểm tra response (status code, body)
         ├── Kiểm tra DB thật (CheckDB) — nếu cần
         └── afterAll: xóa dữ liệu test (Rollback) — nếu cần
```

### Kỹ thuật testing sử dụng

| Kỹ thuật | Mô tả |
|---|---|
| **Supertest** | Gửi HTTP request vào Express app mà không cần start server trên port |
| **Real Database** | Test với MySQL thật, không mock — đảm bảo kết quả chính xác |
| **CheckDB** | Sau khi gọi API, query DB trực tiếp để xác nhận dữ liệu đã lưu đúng |
| **Rollback** | `afterAll()` xóa dữ liệu test → DB sạch sau mỗi lần chạy |
| **JWT Token giả** | Sign token bằng đúng secret key → không cần login thật |
| **App isolation** | Mỗi file test tạo Express app riêng → không ảnh hưởng nhau |
