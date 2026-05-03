// __mocks__/adminGuard.mock.js
// Giả lập adminGuard. Mặc định cho phép tất cả (vì authGuard mặc định là admin trong test admin).
// Test có thể module._setAllow(false) để ép từ chối.

let allow = true;

const adminGuard = (req, res, next) => {
  if (!allow) return res.status(403).json({ error: 'Forbidden' });
  next();
};

adminGuard._setAllow = (v) => {
  allow = v;
};
adminGuard._reset = () => {
  allow = true;
};

module.exports = adminGuard;
