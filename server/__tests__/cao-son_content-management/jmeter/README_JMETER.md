# HƯỚNG DẪN CHẠY JMETER PERFORMANCE TEST – CAO SƠN (Content Management)

## ⚠️ LƯU Ý: TC IDs

TC thực tế của Cao Sơn trong dự án: **TC101–TC140** (đồng bộ với Google Sheets).

## 1. Cài đặt JMeter
```bash
# Tải JMeter 5.6.3
# https://jmeter.apache.org/download_jmeter.cgi
# Giải nén → thêm bin/ vào PATH

# Kiểm tra
jmeter --version
```

## 2. Chuẩn bị server
```bash
cd server
npm install
npm start
# Server chạy tại http://localhost:4000
# Kiểm tra: curl http://localhost:4000/api/health
```

**Yêu cầu:** Cần có admin account trong DB (dùng cho CRUD test):
```bash
node scripts/create-admin.js "Admin User" admin@fit.edu.vn admin123 admin
```

## 3. Chạy test (CLI mode – khuyến nghị)

### Bash / Git Bash / WSL
```bash
cd server
JMETER_DIR=__tests__/cao-son_content-management/jmeter

mkdir -p $JMETER_DIR/reports
rm -f $JMETER_DIR/reports/results.jtl
rm -rf $JMETER_DIR/reports/jmeter_html_report/

jmeter -n \
  -t $JMETER_DIR/content_management.jmx \
  -l $JMETER_DIR/reports/results.jtl \
  -e -o $JMETER_DIR/reports/jmeter_html_report/
```

### PowerShell
```powershell
cd server
$JMETER_DIR = "__tests__\cao-son_content-management\jmeter"

New-Item -ItemType Directory -Force -Path "$JMETER_DIR\reports"
Remove-Item -Force -ErrorAction SilentlyContinue "$JMETER_DIR\reports\results.jtl"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue "$JMETER_DIR\reports\jmeter_html_report"

jmeter -n `
  -t "$JMETER_DIR\content_management.jmx" `
  -l "$JMETER_DIR\reports\results.jtl" `
  -e -o "$JMETER_DIR\reports\jmeter_html_report"
```

## 4. Xem báo cáo
```bash
start __tests__/cao-son_content-management/jmeter/reports/jmeter_html_report/index.html   # Windows
```

## 5. Cấu trúc Test Plan

| Thread Group | Users | Ramp-up (s) | Loops | Samplers | Mục tiêu |
|---|---|---|---|---|---|
| Smoke Test | 1 | 1 | 1 | 14 | Kiểm tra API hoạt động cơ bản + CRUD flow |
| Load Test | 50 | 10 | 10 | 12 | Đánh giá hiệu năng bình thường + DB write contention |
| Stress Test | 200 | 30 | 5 | 11 | Tìm điểm giới hạn hệ thống |

## 6. Mapping TC IDs → JMeter Samplers

| JMeter ID | API Endpoint | Liên quan TC | Mô tả |
|---|---|---|---|
| TJ-S01/L01/X01 | GET /api/health | - | Health check |
| TJ-S02/L02/X02 | GET /api/home | - | Trang chủ (aggregate 6 queries) |
| TJ-S03/L03/X03 | GET /api/news | TC105 | Danh sách tin tức |
| TJ-S04/L04/X04 | GET /api/events | TC107 | Danh sách sự kiện |
| TJ-S05/L05/X05 | GET /api/recruitment | TC111 | Danh sách tuyển dụng |
| TJ-S06/L06/X06 | GET /api/departments | TC119 | Danh sách bộ môn (JOIN lecturers) |
| TJ-S07/L07 | GET /api/majors | TC131 | Danh sách ngành |
| TJ-S08 | GET /api/banners | - | Danh sách banner |
| TJ-S09 | GET /api/enterprises | - | Danh sách doanh nghiệp |
| TJ-S10/L08/X07 | GET /api/news?page=1&limit=10 | TC137 | Pagination |
| TJ-S11/L09/X08 | POST /api/auth/login | - | Login lấy JWT token (OnceOnlyController) |
| TJ-S12/L10/X09 | POST /api/news | TC101 | Create news với token |
| TJ-S13/L11/X10 | PUT /api/news/:id | TC103 | Update news với token |
| TJ-S14/L12/X11 | DELETE /api/news/:id | TC104 | Delete news với token |

## 7. Kỹ thuật sử dụng

- **OnceOnlyController**: Login chỉ 1 lần per thread, tái sử dụng token
- **JSONPostProcessor**: Extract `$.token` từ login response, `$.id` từ create response
- **HeaderManager per sampler**: Gắn `Authorization: Bearer ${auth_token}`
- **CRUD Flow**: Create → extract ID → Update bằng ID → Delete bằng ID (tự cleanup)
- **Duration Assertion**: ≤2000ms (Smoke/Load), ≤5000ms (Stress)

## 8. Kết quả chạy (2026-05-03)

| Metric | Smoke | Load | Stress |
|---|---|---|---|
| Total Requests | 14 | 6,000 | 9,200 |
| Error Rate | 0.00% | 0.22% | 0.00% |
| Avg Response | 12ms | 53ms | 21ms |
| Max Response | 75ms | 2,180ms | 940ms |
| Throughput | 13.3 req/s | 38.5 req/s | 33.2 req/s |

**Bottleneck phát hiện:** DB write contention tại Load Test – connection pool = 10 không đủ khi 50 users CRUD đồng thời → 13 errors (PUT/DELETE vượt Duration Assert 2s).
