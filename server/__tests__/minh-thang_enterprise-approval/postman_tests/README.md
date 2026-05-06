# Postman Tests – MinhThang Enterprise v2
> **Đã căn chỉnh toàn bộ test scripts theo source code thực tế:**
> `period-enterprises.js` · `internship-registrations.js` · `students.js`

---

## Cấu trúc thư mục
```
postman_tests/
├── collections/
│   └── MinhThang_Enterprise.json   ← 35 TC, 6 folder, đầy đủ test script
├── environments/
│   └── local_env.json              ← biến môi trường
├── data/
│   └── enterprise_test_data.csv    ← data-driven cho TC066/067/071
├── reports/                        ← trống, Newman tự sinh vào đây
└── README.md
```

---

## Cài đặt
```bash
npm install -g newman newman-reporter-htmlextra
```

---

## Chạy toàn bộ (CLI)
```bash
newman run collections/MinhThang_Enterprise.json \
  -e environments/local_env.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export reports/report.html \
  --delay-request 300
```

## Chạy data-driven (TC066/067/071)
```bash
newman run collections/MinhThang_Enterprise.json \
  -e environments/local_env.json \
  -d data/enterprise_test_data.csv \
  --folder "01 – Period Enterprises (CRUD)" \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export reports/report_datadriven.html
```

## Chạy một folder cụ thể
```bash
# Chỉ chạy Approval
newman run collections/MinhThang_Enterprise.json \
  -e environments/local_env.json \
  --folder "03 – Approval (Duyệt nguyện vọng)" \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export reports/report_approval.html
```

---

## Biến môi trường quan trọng

| Biến | Mô tả | Nguồn |
|------|-------|-------|
| `baseUrl` | `http://localhost:5000/api` | Cố định |
| `adminToken` | JWT admin (tự lấy qua Pre-request script) | POST /auth/login |
| `studentToken` | JWT sinh viên (cần set thủ công) | POST /students/login |
| `periodId` | ID đợt thực tập hiện tại | Mặc định `1` |
| `newEnterpriseId` | ID enterprise vừa tạo (TC066) | Tự động lưu |
| `preferenceId` | ID preference cần test approval | Cần set thủ công |
| `newStudentId` | ID student vừa tạo (TC085) | Tự động lưu |

---

## Danh sách Test Cases

### Folder 01 – Period Enterprises CRUD
| TC | Method | Endpoint | Mô tả | Expected |
|----|--------|----------|-------|----------|
| TC066 | POST | /period-enterprises | Tạo enterprise hợp lệ + CheckDB + Rollback | 201 |
| TC067 | POST | /period-enterprises | Thiếu trường `name` | 400, error="period_id và name là bắt buộc" |
| TC071 | POST | /period-enterprises | Trùng tên trong cùng đợt | 400, error="Doanh nghiệp này đã được thêm vào đợt này" |
| TC068 | PUT | /period-enterprises/:id | Cập nhật hợp lệ + CheckDB (max_slots=15, is_active=0) | 200 |
| TC071b | PUT | /period-enterprises/:id | Đổi sang tên đã tồn tại trong đợt | 400, error="Tên doanh nghiệp này đã tồn tại trong đợt này" |
| TC069 | PUT | /period-enterprises/99999 | ID không tồn tại | 404, error="Không tìm thấy doanh nghiệp" |
| TC070 | DELETE | /period-enterprises/:id | Xóa thành công + CheckDB (→ 404) | 200, message="Xóa doanh nghiệp khỏi đợt thành công" |

### Folder 02 – GET Period Enterprises
| TC | Method | Endpoint | Mô tả | Expected |
|----|--------|----------|-------|----------|
| – | GET | /period-enterprises?period_id=1 | Lấy danh sách | 200 array |
| – | GET | /period-enterprises | Thiếu period_id | 400, error="period_id là bắt buộc" |
| – | GET | /period-enterprises/:id | Lấy theo ID | 200 object |
| – | GET | /period-enterprises/99999 | ID không tồn tại | 404, error="Không tìm thấy doanh nghiệp" |

### Folder 03 – Approval
| TC | Method | Endpoint | Mô tả | Expected |
|----|--------|----------|-------|----------|
| TC074 | PUT | /internship-registrations/preference/:id/status | Approve thành công + CheckDB auto-reject | 200 |
| TC075 | PUT | /internship-registrations/preference/:id/status | Enterprise đã hết slot | 400, error="Doanh nghiệp này đã hết slot trong đợt này" |
| TC076 | PUT | /internship-registrations/preference/:id/status | Reject preference | 200, slots không đổi |
| TC077 | PUT | /internship-registrations/preference/99999/status | ID không tồn tại | 404, error="Không tìm thấy nguyện vọng" |
| TC078 | PUT | /internship-registrations/preference/:id/status | intern_at_academy=true → HVBCVT | 200, message="Duyệt sinh viên vào Học viện thành công" |
| TC078b | PUT | /internship-registrations/preference/:id/status | intern_at_academy=true + HVBCVT không có | 404 |
| – | PUT | /internship-registrations/preference/:id/status | Status không hợp lệ | 400, error="Trạng thái không hợp lệ" |
| TC090 | PUT | /internship-registrations/preference/:id/status | Không có token | 401 |

### Folder 04 – GET Registrations & Results
| TC | Method | Endpoint | Mô tả | Expected |
|----|--------|----------|-------|----------|
| TC072 | GET | /internship-registrations/all?type=preferences | Admin xem tất cả | 200 array |
| TC073 | GET | /internship-registrations/all?type=preferences&period_id=9999 | Không có SV trong đợt | 200 [] |
| – | GET | /internship-registrations/all?period_id=1 | Thiếu type | 400 |
| TC079 | GET | /internship-registrations/results?lecturer_id=1 | Kết quả theo giảng viên | 200 array |
| TC080 | GET | /internship-registrations/results?type=enterprises | Kết quả theo enterprise | 200 array |
| TC081 | GET | /internship-registrations/my-preferences | SV xem nguyện vọng (student token) | 200 array |
| TC083 | GET | /internship-registrations/results/export | Export xlsx | 200 xlsx |

### Folder 05 – Students CRUD
| TC | Method | Endpoint | Mô tả | Expected |
|----|--------|----------|-------|----------|
| TC084 | GET | /students?q=B99 | Tìm kiếm | 200 array |
| TC093 | GET | /students?q=Nguyen | Tìm kiếm | 200 array |
| TC094 | GET | /students?q=ZZNOTEXIST | Không có kết quả | 200 [] |
| TC095 | GET | /students/:id | Lấy theo ID có major_name | 200 object |
| TC096 | GET | /students/99999 | Không tồn tại | 404, message="Không tìm thấy sinh viên" |
| TC085 | POST | /students/register | Tạo hợp lệ + CheckDB + Rollback | 201 |
| TC086 | POST | /students/register | Thiếu name → validation | 400, có errors array |
| TC087 | POST | /students/register | Trùng student_code | 409, message="Mã sinh viên đã tồn tại" |
| TC087b | POST | /students/register | Trùng email | 409, message="Email đã tồn tại" |
| TC087c | POST | /students/register | GPA > 4.0 | 400, message="GPA phải là số từ 0.0 đến 4.0" |
| TC088 | PUT | /students/:id | Update gpa + CheckDB | 200 |
| TC089 | DELETE | /students/:id | Xóa (transaction + slots trả về) + CheckDB | 204 |

### Folder 06 – Import Excel
| TC | Method | Endpoint | Mô tả | Expected |
|----|--------|----------|-------|----------|
| TC091 | POST | /students/import-excel | 3 rows hợp lệ + Rollback | 200, successCount=3 |
| TC092 | POST | /students/import-excel | 1 valid + 1 thiếu mã | 200, successCount=1, errorCount=1 |
| – | POST | /students/import-excel | Không có file | 400, message="Vui lòng chọn file Excel" |
| TC099 | POST | /period-enterprises/import | 2 enterprises hợp lệ + CheckDB + Rollback | 200, success=2 |
| – | POST | /period-enterprises/import | Thiếu period_id | 400, error="period_id là bắt buộc" |

---

## Lưu ý khi chạy TC Import Excel

Cần chuẩn bị sẵn 3 file Excel trong thư mục `data/`:

### TC091_students_valid.xlsx
| Mã sinh viên | Họ và tên | Email | Số điện thoại | Lớp | Ngành học | Ngày sinh | GPA | Mật khẩu |
|---|---|---|---|---|---|---|---|---|
| B99IMP001 | Test 1 | b99imp001@ptit.edu.vn | 0910000001 | D22TEST | Công nghệ thông tin | 01/01/2003 | 3.5 | B99IMP001 |
| B99IMP002 | Test 2 | b99imp002@ptit.edu.vn | 0910000002 | D22TEST | Công nghệ thông tin | 01/01/2003 | 3.6 | B99IMP002 |
| B99IMP003 | Test 3 | b99imp003@ptit.edu.vn | 0910000003 | D22TEST | Công nghệ thông tin | 01/01/2003 | 3.7 | B99IMP003 |

### TC092_students_partial.xlsx  
| Mã sinh viên | Họ và tên | Email | Số điện thoại | Lớp | Ngành học | Ngày sinh | GPA |
|---|---|---|---|---|---|---|---|
| B99IMP011 | Test Valid | b99imp011@ptit.edu.vn | 0910000011 | D22TEST | Công nghệ thông tin | 01/01/2003 | 3.5 |
| _(trống)_ | Missing Code | missingcode@ptit.edu.vn | 0910000012 | D22TEST | Công nghệ thông tin | 01/01/2003 | 3.5 |

### TC099_enterprises_valid.xlsx
| Tên doanh nghiệp | Mô tả công việc | Địa chỉ | Thông tin liên hệ | Số slot |
|---|---|---|---|---|
| Import Corp A | Backend Dev | Hà Nội | hr@corpa.com | 5 |
| Import Corp B | Frontend Dev | TP HCM | hr@corpb.com | 8 |

---

## Các điểm đã sửa so với file cũ

| # | Vấn đề cũ | Đã sửa |
|---|-----------|--------|
| 1 | `res.body.error` trong TC060 nhưng source trả `res.body.message` | Sửa thành `message` cho DELETE |
| 2 | TC065 test `error.match(/hết slot/i)` nhưng source trả `"Doanh nghiệp này đã hết slot trong đợt này"` | Test chính xác string |
| 3 | TC090 seed dùng `pool` thay vì `conn` (không phải transaction) | Dùng `pool` trực tiếp trong PM |
| 4 | `res.body.error` vs `res.body.message` – `errorResponse()` trong students.js bọc vào `.message` | Phân biệt rõ `error` (period-enterprises) vs `message` (students) |
| 5 | `is_active` CheckDB phải so sánh `=== 0` (MySQL boolean 0/1) | Thêm comment + so sánh đúng |
| 6 | Rollback bằng `pool.query` trực tiếp – không dùng seedPreference với `pool` thay vì `conn` | Rollback trong `pm.sendRequest` |
| 7 | TC078: source kiểm tra `intern_at_academy` và trả `message: "Duyệt sinh viên vào Học viện thành công"` khác TC074 | Tách thành TC078 riêng với message khớp |
