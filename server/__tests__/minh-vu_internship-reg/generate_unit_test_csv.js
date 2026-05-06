/**
 * generate_unit_test_csv.js
 * Chạy Jest cho folder minh-vu_internship-reg, đọc JSON output,
 * rồi ghi kết quả ra file CSV theo cột yêu cầu.
 *
 * Usage: node __tests__/minh-vu_internship-reg/generate_unit_test_csv.js
 *    or: npm run test:minh-vu:csv
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ─── Metadata tĩnh cho từng TC ────────────────────────────────────────────────

const TC_META = {
  // ── internship-periods.js ──────────────────────────────────────────────────
  TC021: {
    file: "internship-periods.js",
    functionMethod: "GET /api/internship-periods",
    objective: "Return full list of internship periods, sorted DESC by start_date",
    input: "No body / params",
    expectedOutput: "200 – array sorted DESC",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert SQL contains ORDER BY start_date DESC",
  },
  TC022: {
    file: "internship-periods.js",
    functionMethod: "GET /api/internship-periods",
    objective: "Return 500 when DB throws an error",
    input: "No body (DB error injected)",
    expectedOutput: "500 – 'Lỗi khi lấy danh sách đợt đăng ký'",
    tcType: "Exception",
    checkDB: "No",
    rollback: "No",
    notes: "Mock DB error via db.__queueError",
  },
  TC023: {
    file: "internship-periods.js",
    functionMethod: "GET /api/internship-periods/active",
    objective: "Return the currently active period",
    input: "No body / params",
    expectedOutput: "200 – period object with id=5",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC024: {
    file: "internship-periods.js",
    functionMethod: "GET /api/internship-periods/active",
    objective: "Return 404 when no active period exists",
    input: "No body (empty DB result)",
    expectedOutput: "404 – 'Không có đợt đăng ký đang hoạt động'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC025: {
    file: "internship-periods.js",
    functionMethod: "GET /api/internship-periods/:id",
    objective: "Return period detail by id",
    input: "id = 7",
    expectedOutput: "200 – period object with id=7",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert query param passed as ['7']",
  },
  TC026: {
    file: "internship-periods.js",
    functionMethod: "GET /api/internship-periods/:id",
    objective: "Return 404 when period not found",
    input: "id = 9999",
    expectedOutput: "404",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC027: {
    file: "internship-periods.js",
    functionMethod: "POST /api/internship-periods",
    objective: "Return 400 when new period overlaps an existing one",
    input: '{ name, start_date: "2025-02-15", end_date: "2025-04-01" }',
    expectedOutput: "400 – overlap error message",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "Overlap: start_date <= new_end AND end_date >= new_start",
  },
  TC028: {
    file: "internship-periods.js",
    functionMethod: "POST /api/internship-periods",
    objective: "Create period, deactivate others, auto-create academy enterprise",
    input: '{ name, start_date, end_date, is_active: true }',
    expectedOutput: "201 – { id: 42 }; 4 DB calls",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert 4 db.query calls; call[1] UPDATE inactive; call[3] INSERT period_enterprises",
  },
  TC029: {
    file: "internship-periods.js",
    functionMethod: "POST /api/internship-periods",
    objective: "Still return 201 even if academy enterprise INSERT fails (catch+log)",
    input: '{ name, start_date, end_date, is_active: false }; academy INSERT error injected',
    expectedOutput: "201 – { id: 50 }",
    tcType: "Exception",
    checkDB: "Yes",
    rollback: "No",
    notes: "Academy enterprise error is caught and logged, does not affect main response",
  },
  TC030: {
    file: "internship-periods.js",
    functionMethod: "PUT /api/internship-periods/:id",
    objective: "Update period successfully",
    input: 'id=8; { name, start_date: "2025-05-01", end_date: "2025-06-01", is_active: true }',
    expectedOutput: "200 – success",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert WHERE id != ? AND start_date <= ? AND end_date >= ? with correct params",
  },
  TC031: {
    file: "internship-periods.js",
    functionMethod: "PUT /api/internship-periods/:id",
    objective: "Return 400 when update would overlap another period",
    input: "id=8; dates overlap with period id=11",
    expectedOutput: "400 – 'Không thể cập nhật đợt đăng ký'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC032: {
    file: "internship-periods.js",
    functionMethod: "DELETE /api/internship-periods/:id",
    objective: "Delete a period successfully",
    input: "id = 15",
    expectedOutput: "200 – 'Xóa đợt đăng ký thành công'",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert DELETE query param passed as ['15']",
  },

  // ── internship-lecturers.js ────────────────────────────────────────────────
  TC033: {
    file: "internship-lecturers.js",
    functionMethod: "GET /api/internship-lecturers",
    objective: "Return 400 when period_id query param is missing",
    input: "No query params",
    expectedOutput: "400 – 'Thiếu period_id'; db.query NOT called",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert db.query was never called (early return before DB hit)",
  },
  TC034: {
    file: "internship-lecturers.js",
    functionMethod: "GET /api/internship-lecturers",
    objective: "Return lecturer list for a period",
    input: "period_id = 1",
    expectedOutput: "200 – array of 2 lecturers",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert query param passed as ['1']",
  },
  TC035: {
    file: "internship-lecturers.js",
    functionMethod: "GET /api/internship-lecturers",
    objective: "Apply can_guide filter when provided",
    input: "period_id=1, can_guide=true",
    expectedOutput: "200 – filtered list; SQL has AND lp.can_guide = ?",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert SQL clause AND lp.can_guide = ? and params [1, 1]",
  },
  TC036: {
    file: "internship-lecturers.js",
    functionMethod: "GET /api/internship-lecturers",
    objective: "Return 500 when DB throws an error",
    input: "period_id=1 (DB error injected)",
    expectedOutput: "500 – 'Lỗi khi lấy danh sách giảng viên hướng dẫn'",
    tcType: "Exception",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC037: {
    file: "internship-lecturers.js",
    functionMethod: "GET /api/internship-lecturers/available",
    objective: "Return 400 when period_id is missing",
    input: "No query params",
    expectedOutput: "400",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC038: {
    file: "internship-lecturers.js",
    functionMethod: "GET /api/internship-lecturers/available",
    objective: "Return only lecturers with available slots",
    input: "period_id = 3",
    expectedOutput: "200 – lecturer with available_slots=5",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert SQL: lp.can_guide = TRUE AND (max_slots - current_slots) > 0",
  },
  TC039: {
    file: "internship-lecturers.js",
    functionMethod: "POST /api/internship-lecturers",
    objective: "Return 400 when lecturer_id is missing",
    input: "{ period_id: 1 } (no lecturer_id)",
    expectedOutput: "400; db.query NOT called",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert db.query was never called",
  },
  TC040: {
    file: "internship-lecturers.js",
    functionMethod: "POST /api/internship-lecturers",
    objective: "Upsert lecturer config with INSERT...ON DUPLICATE KEY UPDATE",
    input: "{ period_id:1, lecturer_id:7, can_guide:true, max_slots:15 }",
    expectedOutput: "200 – 'Cập nhật cấu hình giảng viên thành công'",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert INSERT INTO lecturer_periods with params [1, 7, true, 15]",
  },
  TC041: {
    file: "internship-lecturers.js",
    functionMethod: "PUT /api/internship-lecturers/batch",
    objective: "Batch update lecturers in a transaction – COMMIT on success",
    input: "{ period_id:1, lecturers: [2 items] }",
    expectedOutput: "200 – START TRANSACTION + COMMIT; no ROLLBACK",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "Yes",
    notes: "Assert SQL sequence: START TRANSACTION → UPDATE × 2 → COMMIT",
  },
  TC042: {
    file: "internship-lecturers.js",
    functionMethod: "PUT /api/internship-lecturers/batch",
    objective: "Batch update rolls back transaction when one INSERT fails",
    input: "{ period_id:1, lecturers: [2 items] }; 2nd INSERT error injected",
    expectedOutput: "500 – START TRANSACTION + ROLLBACK; no COMMIT",
    tcType: "Exception",
    checkDB: "Yes",
    rollback: "Yes",
    notes: "Assert SQL sequence: START TRANSACTION → UPDATE → ROLLBACK (no COMMIT)",
  },

  // ── internship-registrations.js ───────────────────────────────────────────
  TC043: {
    file: "internship-registrations.js",
    functionMethod: "GET /api/internship-registrations/my-lecturer",
    objective: "Return lecturer registrations filtered by logged-in student",
    input: "Auth: student id=5",
    expectedOutput: "200 – registrations where student_id=5",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert query param[0][0] = studentId 5",
  },
  TC044: {
    file: "internship-registrations.js",
    functionMethod: "GET /api/internship-registrations/my-lecturer",
    objective: "Add period_id filter when query param provided",
    input: "Auth: student id=5; period_id=2",
    expectedOutput: "200 – SQL has AND lp.period_id = ?; params [5, '2']",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert SQL clause and params [5, '2']",
  },
  TC045: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/lecturer",
    objective: "Return 400 when lecturer_id is missing",
    input: "{ period_id: 1 } (no lecturer_id)",
    expectedOutput: "400 – 'Thiếu period_id hoặc lecturer_id'; db.query NOT called",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert db.query was never called",
  },
  TC046: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/lecturer",
    objective: "Return 400 when period is not active",
    input: "{ period_id:1, lecturer_id:3 }; period not found / inactive",
    expectedOutput: "400 – 'không tồn tại hoặc không đang hoạt động'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC047: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/lecturer",
    objective: "Return 400 when outside registration time window",
    input: "{ period_id:1, lecturer_id:3 }; period end_date in the past",
    expectedOutput: "400 – 'Không trong thời gian đăng ký'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC048: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/lecturer",
    objective: "Return 400 when lecturer has no available slots",
    input: "{ period_id:1, lecturer_id:3 }; max_slots=10, current_slots=10",
    expectedOutput: "400 – 'đã hết slot'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC049: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/lecturer",
    objective: "Successfully register lecturer and COMMIT transaction",
    input: "{ period_id:1, lecturer_id:3 }; current_slots=2 / max=10",
    expectedOutput: "201 – START TRANSACTION + COMMIT; no ROLLBACK",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "Yes",
    notes: "Assert SQL sequence: START TRANSACTION → INSERT → UPDATE slots → COMMIT",
  },
  TC050: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/preferences",
    objective: "Return 400 when more than 5 preferences submitted",
    input: "preferences: 6 items",
    expectedOutput: "400 – 'tối đa 5 nguyện vọng'; db.query NOT called",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert db.query was never called",
  },
  TC051: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/preferences",
    objective: "Return 400 when student has not registered a lecturer yet",
    input: "{ period_id:1, preferences:[1 item] }; no lecturer registration",
    expectedOutput: "400 – 'phải đăng ký giảng viên hướng dẫn trước'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC052: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/preferences",
    objective: "Return 400 when student already submitted preferences for this period",
    input: "{ period_id:1, preferences:[1 item] }; existing preferences",
    expectedOutput: "400 – 'đã đăng ký nguyện vọng'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC053: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/preferences",
    objective: "Return 400 when preference_order values are duplicated",
    input: "preferences: 2 items with same preference_order=1",
    expectedOutput: "400 – 'Thứ tự nguyện vọng'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC054: {
    file: "internship-registrations.js",
    functionMethod: "GET /api/internship-registrations/all",
    objective: "Return 400 when type query param is missing",
    input: "No query params (admin auth)",
    expectedOutput: "400 – error about type",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC055: {
    file: "internship-registrations.js",
    functionMethod: "GET /api/internship-registrations/all",
    objective: "Return all registrations filtered by type=lecturer",
    input: "type=lecturer (admin auth)",
    expectedOutput: "200 – array of registrations",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC056: {
    file: "internship-registrations.js",
    functionMethod: "PUT /api/internship-registrations/lecturer/:id/status",
    objective: "Return 400 when status value is invalid",
    input: '{ status: "unknown" }',
    expectedOutput: "400 – 'Trạng thái không hợp lệ'; db.query NOT called",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert db.query was never called",
  },
  TC057: {
    file: "internship-registrations.js",
    functionMethod: "PUT /api/internship-registrations/lecturer/:id/status",
    objective: "Update registration status to approved",
    input: 'id=10; { status: "approved", notes: "OK" }',
    expectedOutput: "200 – params ['approved', 'OK', '10']",
    tcType: "Standard",
    checkDB: "Yes",
    rollback: "No",
    notes: "Assert query params equal ['approved', 'OK', '10']",
  },
  TC058: {
    file: "internship-registrations.js",
    functionMethod: "POST /api/internship-registrations/approve-to-academy",
    objective: "Return 404 when academy enterprise not found for the period",
    input: "{ student_id:5, period_id:1 }; no academy enterprise",
    expectedOutput: "404 – 'Học viện'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },

  // ── validateInternshipPeriod.js (middleware) ───────────────────────────────
  TC059: {
    file: "validateInternshipPeriod.js",
    functionMethod: "validateInternshipPeriod middleware",
    objective: "Call next() when both dates are valid and end > start",
    input: 'start_date: "2025-01-01", end_date: "2025-02-01"',
    expectedOutput: "next() called once; res.status NOT called",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC060: {
    file: "validateInternshipPeriod.js",
    functionMethod: "validateInternshipPeriod middleware",
    objective: "Return 400 when end_date is before start_date",
    input: 'start_date: "2025-02-10", end_date: "2025-02-01"',
    expectedOutput: "400 – 'Thời gian kết thúc đăng ký phải sau thời gian bắt đầu'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC061: {
    file: "validateInternshipPeriod.js",
    functionMethod: "validateInternshipPeriod middleware",
    objective: "Return 400 when end_date equals start_date (boundary: end <= start)",
    input: 'start_date: "2025-02-10", end_date: "2025-02-10"',
    expectedOutput: "400 – boundary condition end == start rejected",
    tcType: "Exception",
    checkDB: "No",
    rollback: "No",
    notes: "Boundary Value: equal dates must be rejected (condition: end > start)",
  },
  TC062: {
    file: "validateInternshipPeriod.js",
    functionMethod: "validateInternshipPeriod middleware",
    objective: "Return 400 when start_date is an invalid date string",
    input: 'start_date: "abc", end_date: "2025-02-10"',
    expectedOutput: "400 – 'Ngày tháng không hợp lệ'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC063: {
    file: "validateInternshipPeriod.js",
    functionMethod: "validateInternshipPeriod middleware",
    objective: "Return 400 when end_date is an invalid date string",
    input: 'start_date: "2025-02-01", end_date: "32/13/2025"',
    expectedOutput: "400 – 'Ngày tháng không hợp lệ'",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "",
  },
  TC064: {
    file: "validateInternshipPeriod.js",
    functionMethod: "validateInternshipPeriod middleware",
    objective: "Skip validation and call next() when only start_date is provided",
    input: 'start_date: "2025-01-01" (no end_date)',
    expectedOutput: "next() called; no validation error",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "Partial body: validation skipped when both fields not present",
  },
  TC065: {
    file: "validateInternshipPeriod.js",
    functionMethod: "validateInternshipPeriod middleware",
    objective: "Skip validation and call next() when body is empty",
    input: "Empty body {}",
    expectedOutput: "next() called; no validation error",
    tcType: "Standard",
    checkDB: "No",
    rollback: "No",
    notes: "No fields present – middleware is a no-op",
  },
};

// ─── Tiện ích ──────────────────────────────────────────────────────────────────

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function extractTcId(title) {
  const m = title.match(/TC\d{3}/i);
  return m ? m[0].toUpperCase() : null;
}

// ─── Paths ─────────────────────────────────────────────────────────────────────

const serverDir = path.resolve(__dirname, "../..");
const jestBin = path.join(serverDir, "node_modules", ".bin", "jest");
const outDir = __dirname;
const jsonOut = path.join(outDir, "unit_test_results.json");

// ─── Chạy Jest ─────────────────────────────────────────────────────────────────

console.log("Running Jest for minh-vu_internship-reg …");

try {
  execSync(
    `"${jestBin}" --forceExit --detectOpenHandles --runInBand --json --outputFile="${jsonOut}" __tests__/minh-vu_internship-reg`,
    { cwd: serverDir, stdio: "inherit" }
  );
} catch {
  // Jest exits with code 1 on failures – still read the JSON
}

if (!fs.existsSync(jsonOut)) {
  console.error("Jest JSON output not found. Aborting.");
  process.exit(1);
}

const jestReport = JSON.parse(fs.readFileSync(jsonOut, "utf8"));

// ─── Map kết quả Jest → { tcId: { result, actualOutput } } ───────────────────

const resultMap = new Map();

for (const suite of jestReport.testResults || []) {
  for (const t of suite.assertionResults || []) {
    const tcId = extractTcId(t.title);
    if (!tcId) continue;

    const passed = t.status === "passed";
    const meta = TC_META[tcId];
    const actualOutput = passed
      ? meta ? meta.expectedOutput : "(as expected)"
      : t.failureMessages.join(" | ").replace(/\n/g, " ").substring(0, 200);

    resultMap.set(tcId, { result: passed ? "Pass" : "Fail", actualOutput });
  }
}

// ─── Build CSV ─────────────────────────────────────────────────────────────────

const header =
  "TC ID,File / Module,Function / Method,Testing Objectives,Input,Expected Output,Actual Output,TC Type,CheckDB,Rollback,Notes / Techniques,Result\n";

const rows = Object.entries(TC_META).map(([tcId, meta]) => {
  const r = resultMap.get(tcId) || { result: "Not Run", actualOutput: "" };
  return [
    tcId,
    csvEscape(meta.file),
    csvEscape(meta.functionMethod),
    csvEscape(meta.objective),
    csvEscape(meta.input),
    csvEscape(meta.expectedOutput),
    csvEscape(r.actualOutput),
    csvEscape(meta.tcType),
    csvEscape(meta.checkDB),
    csvEscape(meta.rollback),
    csvEscape(meta.notes),
    csvEscape(r.result),
  ].join(",");
});

const csvContent = header + rows.join("\n") + "\n";

// ─── Ghi file ──────────────────────────────────────────────────────────────────

const csvPath = path.join(outDir, "unit_test_tracking.csv");
const tmpPath = path.join(outDir, "unit_test_tracking.generated.csv");

fs.writeFileSync(tmpPath, "﻿" + csvContent, "utf8");
try {
  if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
  fs.renameSync(tmpPath, csvPath);
  console.log(`\n✅ CSV written: ${csvPath}`);
} catch (e) {
  console.warn(`⚠️  Cannot overwrite (file open?): ${e.message}`);
  console.warn(`📄 Temp file at: ${tmpPath}`);
}

// ─── Summary ───────────────────────────────────────────────────────────────────

const allMeta = Object.values(TC_META);
const checkDbCount = allMeta.filter((m) => m.checkDB === "Yes").length;
const rollbackCount = allMeta.filter((m) => m.rollback === "Yes").length;
const passCount = [...resultMap.values()].filter((r) => r.result === "Pass").length;
const failCount = [...resultMap.values()].filter((r) => r.result === "Fail").length;

console.log(`\n📊 Total TCs        : ${allMeta.length}`);
console.log(`✅ Pass             : ${passCount}`);
console.log(`❌ Fail             : ${failCount}`);
console.log(`🗄️  CheckDB = Yes   : ${checkDbCount}`);
console.log(`🔁 Rollback = Yes   : ${rollbackCount}`);
