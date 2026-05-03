// __mocks__/auth.mock.js
// Giả lập authGuard. Mặc định gắn user student id=1.
// Test có thể đổi qua module._setUser({...}) trước khi gọi API.

let currentUser = { id: 1, role: 'student' };

const authGuard = (req, res, next) => {
  req.user = { ...currentUser };
  next();
};

authGuard._setUser = (u) => {
  currentUser = u;
};
authGuard._reset = () => {
  currentUser = { id: 1, role: 'student' };
};

module.exports = authGuard;
