// __mocks__/db.mock.js
// Giả lập module ../config/db. Mỗi test có thể tự push response vào hàng đợi.

const queryFn = jest.fn();

const db = {
  query: queryFn,
  __reset: () => {
    queryFn.mockReset();
  },
  // Helper: queue response cho từng lần db.query() được gọi (theo thứ tự)
  __queue: (...responses) => {
    responses.forEach((r) => {
      // mysql2 trả về [rows, fields]
      if (Array.isArray(r) && r.length === 2 && Array.isArray(r[0])) {
        queryFn.mockResolvedValueOnce(r);
      } else {
        // Cho phép truyền thẳng rows -> tự bọc thành [rows, []]
        queryFn.mockResolvedValueOnce([r, []]);
      }
    });
  },
  __queueError: (err) => {
    queryFn.mockRejectedValueOnce(err);
  },
};

module.exports = db;
