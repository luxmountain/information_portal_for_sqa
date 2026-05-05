# Hướng dẫn đọc báo cáo HTML của JMeter

## Tổng quan

JMeter HTML Report Dashboard là giao diện trực quan hiển thị kết quả performance test. Báo cáo gồm nhiều trang/tab, mỗi trang chứa các biểu đồ và bảng thống kê khác nhau.

---

## 1. Dashboard (Trang chính)

Trang tổng quan hiển thị ngay khi mở `index.html`.

### 1.1 Test and Report Information

| Thông số | Ý nghĩa |
|----------|----------|
| Source file | File `.jtl` nguồn dùng để tạo báo cáo |
| Start Time | Thời điểm bắt đầu test |
| End Time | Thời điểm kết thúc test |
| Filter for display | Bộ lọc áp dụng (nếu có) |

### 1.2 APDEX (Application Performance Index)

Chỉ số đánh giá mức độ hài lòng của người dùng dựa trên thời gian phản hồi.

| Thông số | Ý nghĩa |
|----------|----------|
| Apdex | Điểm từ 0 → 1. **1 = hoàn hảo**, **0 = tệ nhất** |
| T (Toleration threshold) | Ngưỡng chấp nhận được (mặc định 500ms) |
| F (Frustration threshold) | Ngưỡng gây khó chịu (mặc định 1500ms) |
| Label | Tên request/sampler |

**Cách tính:**
- Satisfied: response time ≤ T
- Tolerating: T < response time ≤ F
- Frustrated: response time > F
- `Apdex = (Satisfied + Tolerating/2) / Total`

### 1.3 Requests Summary

Biểu đồ tròn (pie chart) hiển thị tỷ lệ:
- **OK (xanh)**: Request thành công (HTTP 2xx)
- **KO (đỏ)**: Request thất bại (lỗi)

### 1.4 Statistics Table

Bảng thống kê chi tiết cho từng request:

| Cột | Ý nghĩa |
|-----|----------|
| Label | Tên request |
| #Samples | Tổng số request đã gửi |
| KO | Số request thất bại |
| Error % | Tỷ lệ lỗi (%) |
| Average | Thời gian phản hồi trung bình (ms) |
| Min | Thời gian phản hồi nhỏ nhất (ms) |
| Max | Thời gian phản hồi lớn nhất (ms) |
| Median | Giá trị trung vị (50% request nhanh hơn giá trị này) |
| 90th pct | 90% request có response time ≤ giá trị này |
| 95th pct | 95% request có response time ≤ giá trị này |
| 99th pct | 99% request có response time ≤ giá trị này |
| Throughput | Số request xử lý được/giây (req/s) |
| Received | Dữ liệu nhận được (KB/s) |
| Sent | Dữ liệu gửi đi (KB/s) |

---

## 2. Charts (Biểu đồ)

### 2.1 Over Time

#### Response Times Over Time
- Trục X: thời gian
- Trục Y: response time (ms)
- Hiển thị xu hướng thời gian phản hồi theo thời gian chạy test

#### Bytes Throughput Over Time
- Lượng dữ liệu truyền/nhận theo thời gian (bytes/sec)

#### Latencies Over Time
- Độ trễ mạng (thời gian từ lúc gửi request đến khi nhận byte đầu tiên)

#### Connect Time Over Time
- Thời gian thiết lập kết nối TCP/SSL theo thời gian

#### Response Times Percentiles Over Time
- Các percentile (min, median, max, 90th, 95th, 99th) thay đổi theo thời gian

#### Active Threads Over Time
- Số lượng virtual user (thread) đang hoạt động tại mỗi thời điểm

### 2.2 Throughput

#### Hits Per Second
- Số request gửi đến server mỗi giây

#### Codes Per Second
- Phân bổ HTTP status code theo thời gian (200, 404, 500...)

#### Transactions Per Second
- Số transaction hoàn thành mỗi giây (phân biệt OK/KO)

#### Total Transactions Per Second
- Tổng hợp tất cả transaction/giây

#### Response Time vs Request
- Mối quan hệ giữa số request/giây và thời gian phản hồi
- Giúp xác định **điểm bão hòa** (saturation point) của server

#### Latency vs Request
- Mối quan hệ giữa số request/giây và độ trễ

### 2.3 Response Times

#### Response Time Percentiles
- Biểu đồ phân bổ percentile của response time
- Trục X: percentile (0% → 100%)
- Trục Y: response time (ms)

#### Response Time Overview
- Phân bổ response time theo các nhóm APDEX (Satisfied/Tolerating/Frustrated)

#### Time vs Threads
- Response time thay đổi như thế nào khi tăng số thread
- Giúp xác định server chịu được bao nhiêu user đồng thời

#### Response Time Distribution
- Histogram phân bổ response time
- Trục X: khoảng thời gian (ms)
- Trục Y: số request rơi vào khoảng đó

---

## 3. Errors

### Top 5 Errors by Sampler
- Hiển thị 5 lỗi phổ biến nhất cho mỗi request
- Bao gồm: loại lỗi, số lần xuất hiện, tỷ lệ %

---

## 4. Cách đọc nhanh để đánh giá kết quả

| Tiêu chí | Tốt | Cần xem xét | Tệ |
|-----------|-----|-------------|-----|
| Error % | 0% | < 1% | > 5% |
| Apdex | > 0.9 | 0.5 - 0.9 | < 0.5 |
| 90th pct | < 1s | 1-3s | > 3s |
| Throughput | Ổn định | Dao động nhẹ | Giảm dần |

### Dấu hiệu server bị quá tải:
1. Response time tăng dần theo thời gian
2. Throughput giảm khi tăng thread
3. Error rate tăng đột biến
4. Connect time tăng cao

---

## 5. Thuật ngữ quan trọng

| Thuật ngữ | Giải thích |
|-----------|-----------|
| Sampler | Một request/action trong test plan |
| Thread | Virtual user (người dùng ảo) |
| Throughput | Khả năng xử lý của server (req/s) |
| Latency | Thời gian chờ phản hồi đầu tiên |
| Percentile | Phần trăm request có response time ≤ giá trị đó |
| Saturation point | Điểm server bắt đầu quá tải |
