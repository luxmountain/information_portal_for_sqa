# Giải thích JMeter Performance Test – Cao Sơn (Content Management)

> File này giải thích chi tiết cơ chế hoạt động của JMeter test plan trong dự án, dùng để QA với giáo viên.

---

## 1. JMeter là gì và tại sao dùng nó?

JMeter là tool **performance testing** mã nguồn mở của Apache. Nó mô phỏng nhiều người dùng truy cập đồng thời vào server để đo:
- **Response Time**: Server phản hồi mất bao lâu?
- **Throughput**: Server xử lý được bao nhiêu request/giây?
- **Error Rate**: Bao nhiêu % request bị lỗi dưới tải?
- **Bottleneck**: Điểm nào của hệ thống bị nghẽn trước?

Trong dự án này, dùng JMeter để test hiệu năng **Content Management API** (Node.js/Express + MySQL).

---

## 2. Cấu trúc Test Plan (.jmx)

File `.jmx` là XML mô tả toàn bộ kịch bản test. Cấu trúc cây:

```
Test Plan
├── HTTP Request Defaults          ← Cấu hình chung (host, port)
├── HTTP Header Manager            ← Headers chung (Content-Type: application/json)
│
├── Thread Group 1: Smoke Test     ← 1 user, 1 loop
│   ├── GET /api/health
│   ├── GET /api/home
│   ├── GET /api/news
│   ├── ... (10 GET samplers)
│   ├── OnceOnlyController
│   │   └── POST /api/auth/login   ← Login 1 lần, lấy token
│   ├── POST /api/news (Create)    ← Dùng token từ login
│   ├── PUT /api/news/:id (Update) ← Dùng ID từ create
│   └── DELETE /api/news/:id       ← Xóa bài vừa tạo (cleanup)
│
├── Thread Group 2: Load Test      ← 50 users, 10 loops
│   └── (tương tự Smoke nhưng 12 samplers)
│
├── Thread Group 3: Stress Test    ← 200 users, 5 loops
│   └── (tương tự nhưng 11 samplers)
│
└── Listeners                      ← Thu thập kết quả
    ├── View Results Tree
    ├── Summary Report
    └── Aggregate Report
```

### Các thành phần quan trọng (theo JMeter docs):

| Thành phần | Vai trò | Trong dự án |
|---|---|---|
| **Test Plan** | Container gốc, chứa mọi thứ | `serialize_threadgroups = true` → 3 groups chạy tuần tự |
| **Thread Group** | Mô phỏng nhóm users | Smoke (1u), Load (50u), Stress (200u) |
| **Sampler** | Gửi request tới server | HTTP Request (GET, POST, PUT, DELETE) |
| **Config Element** | Cấu hình chung | HTTP Defaults (host:port), Header Manager |
| **Logic Controller** | Điều khiển luồng | OnceOnlyController (login 1 lần) |
| **Post-Processor** | Xử lý response | JSONPostProcessor (extract token, id) |
| **Assertion** | Kiểm tra kết quả | Response Code = 200, Duration ≤ 2000ms |
| **Listener** | Thu thập & hiển thị kết quả | Summary Report, Aggregate Report |

---

## 3. Thread Group hoạt động thế nào?

Thread Group có 3 tham số chính:

### Users (Threads)
Mỗi thread = 1 virtual user. Các threads chạy **song song** và **độc lập**.
- Smoke: 1 thread → test cơ bản, đảm bảo API hoạt động
- Load: 50 threads → mô phỏng tải bình thường
- Stress: 200 threads → đẩy hệ thống đến giới hạn

### Ramp-Up Period
Thời gian để khởi động tất cả threads. Tránh tất cả users đổ vào cùng lúc.

```
Load Test: 50 users, Ramp-Up = 10s
→ Mỗi 0.2s thêm 1 user mới (50 users / 10s)

Timeline:
0.0s  → Thread 1 bắt đầu
0.2s  → Thread 2 bắt đầu
0.4s  → Thread 3 bắt đầu
...
10.0s → Thread 50 bắt đầu (tất cả đang chạy)
```

### Loops
Mỗi thread lặp lại toàn bộ samplers N lần.

```
Tổng requests = Users × Loops × Samplers/thread
Load Test: 50 × 10 × 12 = 6,000 requests
Stress Test: 200 × 5 × (7 GET + 1 login + 3 CRUD) ≈ 9,200 requests
```

---

## 4. Thứ tự thực thi (Execution Order)

Theo JMeter docs, trong mỗi sampler, thứ tự là:

```
1. Configuration Elements    ← HTTP Defaults, Header Manager
2. Pre-Processors           ← (không dùng trong test plan này)
3. Timers                   ← (không dùng – requests gửi liên tục không delay)
4. Sampler                  ← HTTP Request → gửi tới server → nhận response
5. Post-Processors          ← JSONPostProcessor extract $.token, $.id
6. Assertions               ← Check Response Code = 200, Duration ≤ 2000ms
7. Listeners                ← Ghi kết quả vào results.jtl
```

**Lưu ý:** Không dùng Timer trong test plan này. Theo JMeter docs:
> *"If you do not add a delay, JMeter could overwhelm your server by making too many requests in a very short amount of time."*

Đây là **cố ý** – mục đích là stress test, muốn đẩy server đến giới hạn.

---

## 5. Scoping Rules (Phạm vi áp dụng)

Theo JMeter docs, các elements áp dụng theo **vị trí trong cây**:

```
Test Plan
├── Header Manager (Content-Type: application/json)  ← Áp dụng cho TẤT CẢ samplers
│
└── Thread Group: Load Test
    ├── GET /api/health                              ← Dùng Header Manager ở trên
    ├── GET /api/news                                ← Dùng Header Manager ở trên
    └── POST /api/news (Create)
        └── Header Manager (Authorization: Bearer)   ← CHỈ áp dụng cho sampler này
```

- **Header Manager ở Test Plan level**: `Content-Type: application/json` → tất cả requests đều có
- **Header Manager ở Sampler level**: `Authorization: Bearer ${auth_token}` → chỉ CRUD requests mới có (vì GET public không cần token)

---

## 6. Luồng CRUD Flow chi tiết

Đây là phần đặc sắc nhất – test **Create → Update → Delete** news dưới tải, liên kết với unit test TC138/TC140/TC141.

```
Thread bắt đầu (iteration 1)
│
▼
┌─────────────────────────────────────────────────────┐
│ GET /api/health, GET /api/home, ... (các GET tests) │
└─────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────┐
│ OnceOnlyController                                  │
│ (Chỉ chạy ở iteration ĐẦU TIÊN của mỗi thread)    │
│                                                     │
│  POST /api/auth/login                               │
│  Request:  {"email":"admin@fit.edu.vn",             │
│             "password":"admin123"}                   │
│  Response: {"success":true,                         │
│             "token":"eyJhbGciOi..."}                 │
│                                                     │
│  → JSONPostProcessor:                               │
│    auth_token = $.token  (lưu vào biến thread-local)│
└─────────────────────────────────────────────────────┘
│
▼  (iteration 2, 3, ... N → BỎ QUA login, dùng lại auth_token)
│
┌─────────────────────────────────────────────────────┐
│ POST /api/news (Create)                             │
│  Header: Authorization: Bearer ${auth_token}        │
│  Request:  {"title":"JMeter Load 5-3",              │
│             "summary":"Load test",                  │
│             "content":"Content by JMeter load"}     │
│  Response: {"id":157, "title":"JMeter Load 5-3"}    │
│                                                     │
│  → JSONPostProcessor:                               │
│    created_news_id = $.id  (= 157)                  │
│  → Assert: Response Code = 201                      │
│  → Assert: Duration ≤ 2000ms                        │
└─────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────┐
│ PUT /api/news/157 (Update)                          │
│  Header: Authorization: Bearer ${auth_token}        │
│  Request:  {"title":"Updated Load 5"}               │
│  Response: {"id":157, "title":"Updated Load 5"}     │
│                                                     │
│  → Assert: Response Code = 200                      │
│  → Assert: Duration ≤ 2000ms                        │
└─────────────────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────────────────┐
│ DELETE /api/news/157 (Delete)                       │
│  Header: Authorization: Bearer ${auth_token}        │
│  Response: {"message":"Xóa thành công"}             │
│                                                     │
│  → Assert: Response Code = 200                      │
│  → Assert: Duration ≤ 2000ms                        │
│  (Tự cleanup – không để rác trong DB)               │
└─────────────────────────────────────────────────────┘
│
▼
Quay lại đầu loop → GET health → GET home → ... → Create → Update → Delete
(lần này BỎ QUA login vì OnceOnlyController)
```

### Tại sao dùng OnceOnlyController?

Theo JMeter docs:
> *"The first thing about this test is that the login request will be executed only the first time through. Subsequent iterations will skip it."*

- Login gọi `bcrypt.compare()` → tốn ~75-139ms (CPU-intensive)
- Nếu login mỗi iteration → lãng phí, không phản ánh thực tế (user login 1 lần, dùng token nhiều lần)
- Token JWT có thời hạn 8h → đủ cho toàn bộ test

### Tại sao dùng JSONPostProcessor?

Cần **truyền dữ liệu giữa các samplers** trong cùng 1 thread:
- Login → extract `token` → dùng cho Create/Update/Delete
- Create → extract `id` → dùng cho Update/Delete

Biến `${auth_token}` và `${created_news_id}` là **thread-local** (mỗi thread có giá trị riêng).

---

## 7. Kết quả và phân tích

### 7.1. Tổng quan

| Thread Group | Users | Ramp-Up | Loops | Total Req | Avg | Max | Error Rate | Throughput |
|---|---|---|---|---|---|---|---|---|
| Smoke | 1 | 1s | 1 | 14 | 12ms | 75ms | 0.00% | 13.3 req/s |
| Load | 50 | 10s | 10 | 6,000 | 53ms | 2,180ms | 0.22% | 38.5 req/s |
| Stress | 200 | 30s | 5 | 9,200 | 21ms | 940ms | 0.00% | 33.2 req/s |

### 7.2. Tại sao Load Test có error mà Stress Test thì không?

Đây là câu hỏi giáo viên **rất có thể hỏi**:

```
Load Test:   50 users / 10s ramp-up = 5 users/giây khởi động
Stress Test: 200 users / 30s ramp-up = 6.7 users/giây khởi động
```

Tuy Stress có nhiều users hơn, nhưng:

1. **Ramp-up dài hơn (30s vs 10s)** → requests phân bổ đều hơn theo thời gian
2. **Loops ít hơn (5 vs 10)** → mỗi thread gửi ít CRUD operations hơn
3. **Connection pool = 10**: Load Test có 50 threads × 10 loops = 500 lần write DB. Khi nhiều threads cùng write vào MySQL qua 10 connections → **contention** (tranh chấp) → một số request phải chờ → vượt Duration Assert 2s

**Bottleneck thực sự:** MySQL connection pool = 10 không đủ cho 50 concurrent write operations. Đây là giới hạn cấu hình trong `src/config/db.js`.

### 7.3. Chi tiết errors (13 errors trong Load Test)

| Sampler | Errors | Error Rate | Nguyên nhân |
|---|---|---|---|
| PUT /api/news (Update) | 5 | 1.0% | DB write lock + Duration > 2s (max 2180ms) |
| DELETE /api/news | 4 | 0.8% | DB write lock + Duration > 2s (max 2171ms) |
| POST /api/news (Create) | 2 | 0.4% | DB INSERT contention (max 2031ms) |
| GET /api/home | 2 | 0.4% | 6 concurrent queries + Duration > 2s (max 2142ms) |

**Pattern:** Tất cả errors đều là **Duration Assertion failure** (response > 2000ms), không phải HTTP error. Server vẫn trả 200/201 đúng, chỉ là **chậm quá ngưỡng**.

### 7.4. Liên kết với Unit Test

| JMeter TC | Unit Test TC | Mô tả | JMeter phát hiện thêm |
|---|---|---|---|
| TJ-J003 (GET /api/news) | TC142 | Read news list | Avg 44ms dưới 50 users – OK |
| TJ-J011 (POST /api/news) | TC138 | Create news | 0.4% error dưới 50 concurrent writes |
| TJ-J011 (PUT /api/news) | TC140 | Update news | 1.0% error – bottleneck rõ nhất |
| TJ-J011 (DELETE /api/news) | TC141 | Delete news | 0.8% error – DB lock contention |
| TJ-J010 (Pagination) | TC174 | Pagination | Max 548ms – OK |

Unit test chỉ test **1 request tại 1 thời điểm** (functional correctness). JMeter test phát hiện thêm **performance issues khi nhiều users đồng thời** – đây là giá trị chính của performance testing.

---

## 8. Câu hỏi giáo viên có thể hỏi

### Q: Tại sao chọn 50 users cho Load Test và 200 cho Stress?
**A:** Dựa trên đặc thù hệ thống – cổng thông tin Khoa CNTT1 phục vụ ~500 sinh viên + giảng viên. Load 50 users mô phỏng tải bình thường (10% users online). Stress 200 users mô phỏng peak (đầu kỳ, mùa tuyển sinh). Connection pool = 10 nên 50 concurrent writes đã đủ tìm bottleneck.

### Q: Tại sao không dùng Timer?
**A:** Cố ý không dùng Timer để tạo worst-case scenario. Trong thực tế users có think time giữa các actions, nhưng mục đích stress test là tìm giới hạn hệ thống. JMeter docs cũng nói: *"If you do not add a delay, JMeter could overwhelm your server"* – đó chính là điều ta muốn.

### Q: Error 0.22% có nghiêm trọng không?
**A:** 13/6000 requests fail, tất cả đều là Duration > 2s (không phải HTTP error). Server vẫn trả đúng kết quả, chỉ chậm. Trong production, có thể fix bằng cách tăng connection pool từ 10 lên 20-50, hoặc thêm connection queue timeout.

### Q: Tại sao dùng CLI mode thay vì GUI?
**A:** JMeter docs khuyến nghị: *"Using GUI mode should only be used when debugging your Test Plan. To run the real load test, use CLI mode."* GUI tiêu tốn RAM để render UI, ảnh hưởng kết quả test. CLI mode nhẹ hơn, kết quả chính xác hơn.

### Q: OnceOnlyController là gì?
**A:** Theo JMeter docs: *"The login request will be executed only the first time through. Subsequent iterations will skip it."* Dùng để login 1 lần lấy JWT token, các iteration sau tái sử dụng token – giống hành vi thực tế của user.

### Q: JSONPostProcessor hoạt động thế nào?
**A:** Là Post-Processor, chạy SAU khi sampler nhận response. Dùng JSONPath expression (`$.token`, `$.id`) để extract giá trị từ JSON response và lưu vào biến thread-local. Biến này dùng được ở các samplers tiếp theo trong cùng thread.

### Q: Tại sao CRUD flow tự cleanup (Create → Update → Delete)?
**A:** Để test có thể chạy lại nhiều lần mà không cần reset DB. Mỗi iteration tạo 1 bài news → sửa → xóa. Không để dữ liệu rác ảnh hưởng lần chạy sau.

### Q: Phần JMeter test liên quan gì đến unit test?
**A:** Unit test (Jest/Supertest) test **functional correctness** – 1 request, kiểm tra logic đúng/sai. JMeter test **performance** – nhiều requests đồng thời, kiểm tra hệ thống có chịu được tải không. Cùng test các API (TC138 Create, TC140 Update, TC141 Delete) nhưng ở góc độ khác nhau. JMeter phát hiện được DB write contention mà unit test không thể thấy.
