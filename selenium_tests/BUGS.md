# Bugs phát hiện qua Selenium tests

Tài liệu này liệt kê các bug **thực sự trong hệ thống** mà test suite đã phát hiện.
Mỗi bug được tham chiếu bởi 1 test case fail có chủ đích.

---

## BUG #1 — Sai mật khẩu hiện tại làm user bị logout thay vì hiện thông báo

**Test phát hiện:** `tests/test_change_password.py::TestChangePassword::test_TC014_wrong_current_password`

**Mức độ:** Medium (UX bug — user mất context, phải đăng nhập lại)

### Mô tả
Khi sinh viên đổi mật khẩu và nhập **sai mật khẩu hiện tại**:
- **Mong đợi:** Ở lại trang `/student/change-password`, hiện thông báo "Mật khẩu hiện tại không đúng"
- **Thực tế:** Bị **redirect về `/student/login`** và bị logout (token bị xoá)

### Nguyên nhân (root cause)

**File:** `client/src/services/api.js` (dòng 33–50)

Backend trả `HTTP 401` cho mọi loại lỗi xác thực, kể cả khi user nhập sai mật khẩu cũ trong endpoint `PUT /api/students/change-password`. Trong khi đó, axios interceptor ở frontend xử lý **mọi 401** như "token expired":

```javascript
if (error.response?.status === 401) {
  localStorage.removeItem('student_token');
  ...
  window.location.href = '/student/login';   // redirect cứng
}
```

Khi redirect xảy ra, `setError(...)` trong `ChangePassword.jsx` không kịp render → user không thấy thông báo lỗi.

### Đề xuất sửa

**Option 1 — Sửa backend (khuyến nghị):** Phân biệt rõ ràng giữa lỗi authentication (token) và lỗi business (sai input).
- `401 Unauthorized`: chỉ dành cho token invalid/expired
- `400 Bad Request` hoặc `422 Unprocessable Entity`: cho lỗi business như sai mật khẩu hiện tại

**Option 2 — Sửa frontend:** Trong axios interceptor, skip auto-logout cho một số endpoint cụ thể:

```javascript
const url = error.config?.url || '';
const skipLogoutEndpoints = ['/students/change-password'];
if (error.response?.status === 401 && !skipLogoutEndpoints.some(e => url.includes(e))) {
  // logout & redirect
}
```

**Option 3 — Sửa ChangePassword.jsx:** Catch 401 cụ thể và xử lý local thay vì để interceptor handle.

### Khi nào test sẽ pass lại
Sau khi dev fix theo một trong các option trên, chạy lại `pytest tests/test_change_password.py::TestChangePassword::test_TC014_wrong_current_password`. Nếu UI hiện được error message tại trang change-password, test sẽ tự pass.
