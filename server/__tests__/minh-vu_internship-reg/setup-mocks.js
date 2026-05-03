// tests/setup-mocks.js
// Helper: register các mock cho dependency của route file BẰNG jest.doMock
// (không bị hoist, có thể tính path dynamic).
// Trả về { db, authGuard, adminGuard, router } sau khi load route file.

const path = require('path');

function setupMocks(routeAbsPath, opts = {}) {
  const dbPath =
    process.env.DB_PATH ||
    opts.dbPath ||
    path.resolve(path.dirname(routeAbsPath), '../config/db.js');
  const mwDir =
    process.env.MW_DIR ||
    opts.mwDir ||
    path.resolve(path.dirname(routeAbsPath), '../middleware');

  const dbMock = require('./db.mock.js');
  const authMock = require('./auth.mock.js');
  const adminMock = require('./adminGuard.mock.js');

  jest.doMock(dbPath, () => dbMock, { virtual: true });
  jest.doMock(path.join(mwDir, 'auth.js'), () => authMock, { virtual: true });
  jest.doMock(path.join(mwDir, 'auth'), () => authMock, { virtual: true });
  jest.doMock(path.join(mwDir, 'adminGuard.js'), () => adminMock, { virtual: true });
  jest.doMock(path.join(mwDir, 'adminGuard'), () => adminMock, { virtual: true });

  // validateInternshipPeriod: cố gắng dùng file thật, fallback no-op
  const validateMwPath = path.join(mwDir, 'validateInternshipPeriod.js');
  jest.doMock(
    validateMwPath,
    () => {
      try {
        return jest.requireActual(validateMwPath);
      } catch (e) {
        return (req, res, next) => next();
      }
    },
    { virtual: true }
  );
  jest.doMock(
    path.join(mwDir, 'validateInternshipPeriod'),
    () => {
      try {
        return jest.requireActual(validateMwPath);
      } catch (e) {
        return (req, res, next) => next();
      }
    },
    { virtual: true }
  );

  let router;
  try {
    router = require(routeAbsPath);
  } catch (e) {
    return { db: dbMock, authGuard: authMock, adminGuard: adminMock, router: null, error: e };
  }

  return { db: dbMock, authGuard: authMock, adminGuard: adminMock, router };
}

module.exports = { setupMocks };
