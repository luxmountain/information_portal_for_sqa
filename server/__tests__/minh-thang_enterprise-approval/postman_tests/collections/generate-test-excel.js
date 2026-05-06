// generate-test-excel.js
// Chạy: node generate-test-excel.js
// Yêu cầu: npm install xlsx

const XLSX = require('xlsx');

// ── TC091: 3 sinh viên hợp lệ ────────────────────────────────
const tc091 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(tc091,
    XLSX.utils.json_to_sheet([
        { 'mã sinh viên': 'B99IMP001', 'họ và tên': 'Import Student A', 'email': 'imp001@test.com', 'số điện thoại': 911000001, 'lớp': 'D22', 'ngành học': 'Công nghệ thông tin', 'ngày sinh': '2003-01-01', 'gpa': 3.5, 'mật khẩu': '123' },
        { 'mã sinh viên': 'B99IMP002', 'họ và tên': 'Import Student B', 'email': 'imp002@test.com', 'số điện thoại': 911000002, 'lớp': 'D22', 'ngành học': 'Công nghệ thông tin', 'ngày sinh': '2003-01-01', 'gpa': 3.6, 'mật khẩu': '123' },
        { 'mã sinh viên': 'B99IMP003', 'họ và tên': 'Import Student C', 'email': 'imp003@test.com', 'số điện thoại': 911000003, 'lớp': 'D22', 'ngành học': 'Công nghệ thông tin', 'ngày sinh': '2003-01-01', 'gpa': 3.7, 'mật khẩu': '123' },
    ]),
    'Sheet1'
);
XLSX.writeFile(tc091, 'TC091_students_valid.xlsx');
console.log('✅ TC091_students_valid.xlsx');

// ── TC092: 1 hợp lệ + 1 thiếu mã sinh viên ───────────────────
const tc092 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(tc092,
    XLSX.utils.json_to_sheet([
        { 'mã sinh viên': 'B99IMP011', 'họ và tên': 'Valid Student',   'email': 'imp011@ptit.edu.vn', 'số điện thoại': 911000011, 'lớp': 'D22IMPORT', 'ngành học': 'Công nghệ thông tin', 'ngày sinh': '2003-01-01', 'gpa': 3.5, 'mật khẩu': 'B99IMP011' },
        { 'mã sinh viên': '',          'họ và tên': 'Invalid Student', 'email': 'imp012@ptit.edu.vn', 'số điện thoại': 911000012, 'lớp': 'D22IMPORT', 'ngành học': 'Công nghệ thông tin', 'ngày sinh': '2003-02-01', 'gpa': 3.5, 'mật khẩu': 'B99IMP012' },
    ]),
    'Sheet1'
);
XLSX.writeFile(tc092, 'TC092_students_valid.xlsx');
console.log('✅ TC092_students_valid.xlsx');

// ── TC099: 2 doanh nghiệp hợp lệ ─────────────────────────────
const tc099 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(tc099,
    XLSX.utils.json_to_sheet([
        { 'Tên doanh nghiệp': 'Import Corp A', 'Mô tả công việc': 'Backend Dev',  'Địa chỉ': 'Hà Nội',          'Thông tin liên hệ': 'hr@impa.com', 'Số slot tối đa': 5, 'Đang hoạt động': 'Có' },
        { 'Tên doanh nghiệp': 'Import Corp B', 'Mô tả công việc': 'Frontend Dev', 'Địa chỉ': 'TP. Hồ Chí Minh', 'Thông tin liên hệ': 'hr@impb.com', 'Số slot tối đa': 8, 'Đang hoạt động': 'Có' },
    ]),
    'Sheet1'
);
XLSX.writeFile(tc099, 'TC099_students_valid.xlsx');
console.log('✅ TC099_students_valid.xlsx');

console.log('\n✔ Đặt 3 file này cùng thư mục khi chạy: newman run collection.json -e environment.json');