/**
 * ============================================================
 * TEST SUITE: Auth Middleware
 * Test Cases: TC135 → TC136
 * Files under test: src/middleware/auth.js, src/middleware/adminGuard.js
 *                   + crudFactory protect() function
 * ============================================================
 *   - TC135: Truy cập admin endpoint không có token   (Ngoại lệ)
 *   - TC136: Truy cập admin endpoint với student token (Ngoại lệ)
 * ============================================================
 */

const request = require('supertest');
const {
  STUDENT_TOKEN,
  createCrudApp,
} = require('../setup');

/* Dùng /api/news làm đại diện cho admin endpoint (crudFactory protect) */
const authTestApp = createCrudApp('/api/news', {
  tableName: 'news',
  searchableFields: ['title'],
});

/* ============================================================
 * TC135 – Truy cập admin endpoint không có token
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * Input:  POST /api/news KHÔNG có Authorization header
 * Expect: HTTP 401, message 'Authorization header missing'
 * ============================================================ */
describe('TC135 – authMiddleware: không có token', () => {
  it('should return 401 when Authorization header is missing', async () => {
    const response = await request(authTestApp)
      .post('/api/news')
      .send({ title: 'Test without token' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authorization header missing');
  });
});

/* ============================================================
 * TC136 – Truy cập admin endpoint với student token
 * Loại: Ngoại lệ | CheckDB: N | Rollback: N
 * Input:  POST /api/news + Bearer <student_token> (role: 'student')
 * Expect: HTTP 403, message 'Forbidden: Admin access required'
 * Ghi chú: crudFactory protect() kiểm tra role !== 'admin' && !== 'super-admin'
 * ============================================================ */
describe('TC136 – adminGuard: student token bị từ chối', () => {
  it('should return 403 when using student token on admin endpoint', async () => {
    const response = await request(authTestApp)
      .post('/api/news')
      .set('Authorization', `Bearer ${STUDENT_TOKEN}`)
      .send({ title: 'Test with student token' });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Forbidden: Admin access required');
  });
});
