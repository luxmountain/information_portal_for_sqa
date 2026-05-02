# HƯỚNG DẪN CHẠY JMETER PERFORMANCE TEST – CAO SƠN (Content Management)

## ⚠️ LƯU Ý QUAN TRỌNG: TC IDs ĐÚNG
Google Doc hướng dẫn ghi TC138–TC177 là **SAI**.
TC thực tế của Cao Sơn trong dự án: **TC091–TC130** (xem unit test files).

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
# Server chạy tại http://localhost:5000
# Kiểm tra: curl http://localhost:5000/api/health
```

## 3. Chạy test (CLI mode – khuyến nghị)

### Bash / Git Bash / WSL
```bash
cd server

# Tạo thư mục reports
mkdir -p reports

# Chạy test + xuất HTML report
jmeter -n \
  -t test_plans/content_management.jmx \
  -l reports/results.jtl \
  -e -o reports/jmeter_html_report/

# Nếu chạy lại, xóa file cũ trước:
rm -f reports/results.jtl
rm -rf reports/jmeter_html_report/
```

### PowerShell (x86 / x64)
```powershell
cd server

# Tạo thư mục reports
New-Item -ItemType Directory -Force -Path reports

# Chạy test + xuất HTML report
jmeter -n `
  -t test_plans/content_management.jmx `
  -l reports/results.jtl `
  -e -o reports/jmeter_html_report/

# Nếu chạy lại, xóa file cũ trước:
Remove-Item -Force -ErrorAction SilentlyContinue reports/results.jtl
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue reports/jmeter_html_report/
```

## 4. Xem báo cáo
```bash
# Mở HTML report
open reports/jmeter_html_report/index.html    # Mac
start reports/jmeter_html_report/index.html   # Windows
```

## 5. Cấu trúc Test Plan

| Thread Group | Users | Ramp-up (s) | Loops | Samplers | Mục tiêu |
|---|---|---|---|---|---|
| Smoke Test | 1 | 1 | 1 | 11 | Kiểm tra API hoạt động cơ bản |
| Load Test | 50 | 10 | 10 | 9 | Đánh giá hiệu năng bình thường |
| Stress Test | 200 | 30 | 5 | 8 | Tìm điểm giới hạn hệ thống |

## 6. Mapping TC IDs → JMeter Samplers

| JMeter ID | API Endpoint | Liên quan TC | Mô tả |
|---|---|---|---|
| TJ-S01/L01/X01 | GET /api/health | - | Health check |
| TJ-S02/L02/X02 | GET /api/home | - | Trang chủ (aggregate) |
| TJ-S03/L03/X03 | GET /api/news | TC095 | Danh sách tin tức |
| TJ-S04/L04/X04 | GET /api/events | TC097 | Danh sách sự kiện |
| TJ-S05/L05/X05 | GET /api/recruitment | TC101 | Danh sách tuyển dụng |
| TJ-S06/L06/X06 | GET /api/departments | TC104 | Danh sách bộ môn |
| TJ-S07/L07 | GET /api/majors | TC113 | Danh sách ngành |
| TJ-S08 | GET /api/banners | - | Danh sách banner |
| TJ-S09 | GET /api/enterprises | - | Danh sách doanh nghiệp |
| TJ-S10/L08/X07 | GET /api/news?page=1&limit=10 | TC127 | Pagination |
| TJ-S11/L09/X08 | POST /api/news (no token) | TC129 | Auth middleware → 401 |
