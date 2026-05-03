/**
 * Unit Tests - validateInternshipPeriod Middleware
 * File: server/src/middleware/validateInternshipPeriod.js
 * Framework: Jest + Supertest
 *
 * Chức năng kiểm thử: Validate start_date / end_date trước khi tạo/cập nhật đợt TT
 */

const request = require('supertest');
const express = require('express');
const validateInternshipPeriod = require('../src/middleware/validateInternshipPeriod');

// Route test đơn giản để gắn middleware
const app = express();
app.use(express.json());
app.post('/test-validate', validateInternshipPeriod, (req, res) => {
  res.status(200).json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('validateInternshipPeriod Middleware', () => {

  // ─── Case hợp lệ ────────────────────────────────────────────────────────────
  test('TC-VIP-001: Cho qua khi end_date sau start_date (hợp lệ)', async () => {
    const res = await request(app)
      .post('/test-validate')
      .send({ start_date: '2025-01-01', end_date: '2025-02-28' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('TC-VIP-002: Cho qua khi chỉ truyền start_date (không có end_date)', async () => {
    const res = await request(app)
      .post('/test-validate')
      .send({ start_date: '2025-01-01' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('TC-VIP-003: Cho qua khi không truyền cả hai ngày', async () => {
    const res = await request(app)
      .post('/test-validate')
      .send({ name: 'Đợt TT 2025' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // ─── Case không hợp lệ ──────────────────────────────────────────────────────
  test('TC-VIP-004: Trả về 400 khi end_date trước start_date', async () => {
    const res = await request(app)
      .post('/test-validate')
      .send({ start_date: '2025-03-01', end_date: '2025-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('sau thời gian bắt đầu');
  });

  test('TC-VIP-005: Trả về 400 khi end_date bằng start_date (cùng ngày)', async () => {
    const res = await request(app)
      .post('/test-validate')
      .send({ start_date: '2025-01-15', end_date: '2025-01-15' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('sau thời gian bắt đầu');
  });

  test('TC-VIP-006: Trả về 400 khi start_date có định dạng không hợp lệ', async () => {
    const res = await request(app)
      .post('/test-validate')
      .send({ start_date: 'not-a-date', end_date: '2025-02-28' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('không hợp lệ');
  });

  test('TC-VIP-007: Trả về 400 khi end_date có định dạng không hợp lệ', async () => {
    const res = await request(app)
      .post('/test-validate')
      .send({ start_date: '2025-01-01', end_date: 'abc-xyz' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('không hợp lệ');
  });

});
