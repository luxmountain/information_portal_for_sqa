// tests/helpers.js
// Helper: build Express app và mock các dependency đường dẫn tương đối
// mà các route file nguyên gốc đang import.

const path = require('path');
const express = require('express');

/**
 * makeApp(routePath, mountPath, opts)
 * - routePath: đường dẫn TUYỆT ĐỐI tới file route gốc (server/src/routes/...)
 *              (Trong test ta sẽ trỏ về một file route copy đã chỉnh require path,
 *               hoặc dùng jest.mock để intercept require)
 * - mountPath: prefix mount router vào Express app
 */
function makeApp(routerModule, mountPath = '/api') {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(mountPath, routerModule);
  // error handler chuẩn
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message || 'Internal error' });
  });
  return app;
}

module.exports = { makeApp };
