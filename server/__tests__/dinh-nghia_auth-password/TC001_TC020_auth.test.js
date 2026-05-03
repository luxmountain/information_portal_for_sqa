const request = require('supertest');

const mockPool = {
  query: jest.fn(),
};

const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn(),
};

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockEmailService = {
  sendPasswordResetEmail: jest.fn(),
};

const buildAuthApp = () => {
  let app;

  jest.isolateModules(() => {
    jest.doMock('../../src/config/db', () => mockPool);
    jest.doMock('bcryptjs', () => mockBcrypt);
    jest.doMock('jsonwebtoken', () => mockJwt);

    const express = require('express');
    const authRoutes = require('../../src/routes/auth');
    const errorHandler = require('../../src/middleware/errorHandler');

    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);
  });

  return app;
};

const buildStudentsApp = (authImpl = (req, res, next) => {
  req.user = { id: 10, role: 'student' };
  next();
}) => {
  let app;

  jest.isolateModules(() => {
    jest.doMock('../../src/config/db', () => mockPool);
    jest.doMock('bcryptjs', () => mockBcrypt);
    jest.doMock('jsonwebtoken', () => mockJwt);
    jest.doMock('../../src/middleware/auth', () => authImpl);
    jest.doMock('../../src/utils/emailService', () => mockEmailService);

    const express = require('express');
    const studentsRoutes = require('../../src/routes/students');
    const errorHandler = require('../../src/middleware/errorHandler');

    app = express();
    app.use(express.json());
    app.use('/api/students', studentsRoutes);
    app.use(errorHandler);
  });

  return app;
};

const buildAuthGuardApp = () => {
  let app;

  jest.isolateModules(() => {
    jest.doMock('jsonwebtoken', () => mockJwt);
    jest.dontMock('../../src/middleware/auth');

    const express = require('express');
    const authGuard = require('../../src/middleware/auth');

    app = express();
    app.get('/protected', authGuard, (req, res) => {
      res.json({ success: true, user: req.user });
    });
  });

  return app;
};

describe('TC001-TC020 | Auth & Password', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Rollback cho unit test: reset toàn bộ mock state sau mỗi test
    jest.clearAllMocks();
  });

  describe('Student login (TC001-TC005)', () => {
    test('TC001: Student login thành công', async () => {
      const app = buildStudentsApp();

      mockPool.query.mockResolvedValueOnce([
        [
          {
            id: 10,
            student_code: 'B21DCCN001',
            name: 'Nguyen Van A',
            email: 'a@student.edu.vn',
            phone: '0900000000',
            major_id: 1,
            major_name: 'CNTT',
            class_name: 'D21CQCN01',
            gpa: 3.6,
            date_of_birth: '2003-01-01',
            password_hash: '$2b$10$abc',
          },
        ],
      ]);
      mockBcrypt.compare.mockResolvedValueOnce(true);
      mockJwt.sign.mockReturnValueOnce('student-token');

      const res = await request(app).post('/api/students/login').send({
        student_code: 'B21DCCN001',
        password: '123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBe('student-token');
      expect(res.body.profile.student_code).toBe('B21DCCN001');
      expect(res.body.profile.role).toBe('student');
      expect(mockBcrypt.compare).toHaveBeenCalled();
    });

    test('TC002: Sai mật khẩu', async () => {
      const app = buildStudentsApp();

      mockPool.query.mockResolvedValueOnce([
        [
          {
            id: 10,
            student_code: 'B21DCCN001',
            password_hash: '$2b$10$abc',
          },
        ],
      ]);
      mockBcrypt.compare.mockResolvedValueOnce(false);

      const res = await request(app).post('/api/students/login').send({
        student_code: 'B21DCCN001',
        password: 'wrong-password',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Mã sinh viên hoặc mật khẩu không đúng');
    });

    test('TC003: Sai mã sinh viên', async () => {
      const app = buildStudentsApp();

      mockPool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).post('/api/students/login').send({
        student_code: 'NOT_EXISTS',
        password: '123456',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Mã sinh viên hoặc mật khẩu không đúng');
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    test('TC004: Thiếu trường bắt buộc', async () => {
      const app = buildStudentsApp();

      const res = await request(app).post('/api/students/login').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('TC005: Input sai format/validation fail', async () => {
      const app = buildStudentsApp();

      const res = await request(app).post('/api/students/login').send({
        student_code: '',
        password: '123456',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('Admin login (TC006-TC008)', () => {
    test('TC006: Admin login thành công', async () => {
      const app = buildAuthApp();

      mockPool.query.mockResolvedValueOnce([
        [
          {
            id: 1,
            name: 'Super Admin',
            email: 'admin@ptit.edu.vn',
            role: 'super-admin',
            password_hash: '$2b$10$adminhash',
          },
        ],
      ]);
      mockBcrypt.compare.mockResolvedValueOnce(true);
      mockJwt.sign.mockReturnValueOnce('admin-token');

      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@ptit.edu.vn',
        password: '123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('admin-token');
      expect(res.body.profile.email).toBe('admin@ptit.edu.vn');
      expect(res.body.profile.role).toBe('super-admin');
    });

    test('TC007: Email sai / không tồn tại', async () => {
      const app = buildAuthApp();

      mockPool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).post('/api/auth/login').send({
        email: 'missing@ptit.edu.vn',
        password: '123456',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });

    test('TC008: Password sai', async () => {
      const app = buildAuthApp();

      mockPool.query.mockResolvedValueOnce([
        [
          {
            id: 1,
            email: 'admin@ptit.edu.vn',
            password_hash: '$2b$10$adminhash',
          },
        ],
      ]);
      mockBcrypt.compare.mockResolvedValueOnce(false);

      const res = await request(app).post('/api/auth/login').send({
        email: 'admin@ptit.edu.vn',
        password: 'wrong',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('Auth guard middleware (TC009-TC012)', () => {
    test('TC009: Token hợp lệ', async () => {
      const app = buildAuthGuardApp();

      mockJwt.verify.mockReturnValueOnce({ id: 1, role: 'admin' });

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.id).toBe(1);
    });

    test('TC010: Thiếu authorization header', async () => {
      const app = buildAuthGuardApp();

      const res = await request(app).get('/protected');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authorization header missing');
    });

    test('TC011: Header sai format', async () => {
      const app = buildAuthGuardApp();

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid authorization header');
    });

    test('TC012: Token sai hoặc hết hạn', async () => {
      const app = buildAuthGuardApp();

      mockJwt.verify.mockImplementationOnce(() => {
        throw new Error('jwt expired');
      });

      const res = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer expired-token');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired token');
    });
  });

  describe('Change password (TC013-TC017)', () => {
    test('TC013: Đổi mật khẩu thành công', async () => {
      const app = buildStudentsApp((req, res, next) => {
        req.user = { id: 15, role: 'student' };
        next();
      });

      mockPool.query
        .mockResolvedValueOnce([[{ password_hash: '$2b$10$oldhash' }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockBcrypt.compare.mockResolvedValueOnce(true);
      mockBcrypt.hash.mockResolvedValueOnce('$2b$10$newhash');

      const res = await request(app).put('/api/students/change-password').send({
        current_password: 'old-pass',
        new_password: 'new-pass-123',
        confirm_password: 'new-pass-123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Đổi mật khẩu thành công');
      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        'UPDATE students SET password_hash = ? WHERE id = ?',
        ['$2b$10$newhash', 15]
      );
    });

    test('TC014: Mật khẩu hiện tại sai', async () => {
      const app = buildStudentsApp((req, res, next) => {
        req.user = { id: 15, role: 'student' };
        next();
      });

      mockPool.query.mockResolvedValueOnce([[{ password_hash: '$2b$10$oldhash' }]]);
      mockBcrypt.compare.mockResolvedValueOnce(false);

      const res = await request(app).put('/api/students/change-password').send({
        current_password: 'wrong-old',
        new_password: 'new-pass-123',
        confirm_password: 'new-pass-123',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Mật khẩu hiện tại không đúng');
    });

    test('TC015: Token không phải student', async () => {
      const app = buildStudentsApp((req, res, next) => {
        req.user = { id: 1, role: 'admin' };
        next();
      });

      const res = await request(app).put('/api/students/change-password').send({
        current_password: 'old-pass',
        new_password: 'new-pass-123',
        confirm_password: 'new-pass-123',
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Chỉ sinh viên mới có quyền đổi mật khẩu');
    });

    test('TC016: Mật khẩu mới quá ngắn', async () => {
      const app = buildStudentsApp();

      const res = await request(app).put('/api/students/change-password').send({
        current_password: 'old-pass',
        new_password: '123',
        confirm_password: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    test('TC017: Confirm password không khớp', async () => {
      const app = buildStudentsApp();

      const res = await request(app).put('/api/students/change-password').send({
        current_password: 'old-pass',
        new_password: 'new-pass-123',
        confirm_password: 'new-pass-999',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('Forgot password (TC018-TC019)', () => {
    test('TC018: Email tồn tại -> tạo reset token thành công', async () => {
      const app = buildStudentsApp();

      mockPool.query
        .mockResolvedValueOnce([
          [
            {
              id: 22,
              student_code: 'B21DCCN022',
              name: 'Le Thi B',
              email: 'b@student.edu.vn',
            },
          ],
        ])
        .mockResolvedValueOnce([{ insertId: 100 }]);
      mockEmailService.sendPasswordResetEmail.mockResolvedValueOnce();

      const res = await request(app).post('/api/students/forgot-password').send({
        email: 'b@student.edu.vn',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Chúng tôi đã gửi link khôi phục mật khẩu');

      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        'INSERT INTO password_reset_tokens (student_id, token, expires_at) VALUES (?, ?, ?)',
        [22, expect.any(String), expect.any(Date)]
      );
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'b@student.edu.vn',
        expect.any(String),
        'Le Thi B'
      );
    });

    test('TC019: Email không tồn tại -> trả generic success message', async () => {
      const app = buildStudentsApp();

      mockPool.query.mockResolvedValueOnce([[]]);

      const res = await request(app).post('/api/students/forgot-password').send({
        email: 'notfound@student.edu.vn',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Nếu email tồn tại');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('Reset password (TC020)', () => {
    test('TC020: Reset password thành công bằng token hợp lệ', async () => {
      const app = buildStudentsApp();

      const future = new Date(Date.now() + 30 * 60 * 1000);

      mockPool.query
        .mockResolvedValueOnce([
          [
            {
              token: 'valid-reset-token',
              student_id: 30,
              expires_at: future,
              used: 0,
            },
          ],
        ])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);
      mockBcrypt.hash.mockResolvedValueOnce('$2b$10$newlyHashedPassword');

      const res = await request(app).post('/api/students/reset-password').send({
        token: 'valid-reset-token',
        password: 'new-pass-123',
        confirm_password: 'new-pass-123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Đặt lại mật khẩu thành công');

      expect(mockPool.query).toHaveBeenNthCalledWith(
        2,
        'UPDATE students SET password_hash = ? WHERE id = ?',
        ['$2b$10$newlyHashedPassword', 30]
      );
      expect(mockPool.query).toHaveBeenNthCalledWith(
        3,
        'UPDATE password_reset_tokens SET used = 1 WHERE token = ?',
        ['valid-reset-token']
      );
    });
  });
});
