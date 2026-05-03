/**
 * Script to generate Unit Testing Report (Excel)
 * Module: Internship Registration
 *
 * Run: node tests/generateTestReport.js
 * Output: tests/UnitTestingReport_InternshipRegistration.xlsx
 */

const XLSX = require('xlsx');
const path = require('path');
const fs   = require('fs');

// ─── Read Jest results (if available) ─────────────────────────────────────────
// Jest must be run with: jest --json --outputFile=tests/test-results.json
const resultsPath = path.join(__dirname, 'test-results.json');
const testResults = {};   // { 'TC-IP-001': 'Pass' | 'FAIL' }

if (fs.existsSync(resultsPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    raw.testResults.forEach(suite => {
      suite.assertionResults.forEach(tc => {
        const match = tc.fullName.match(/(TC-[A-Z]+-\d+)/);
        if (match) {
          testResults[match[1]] = tc.status === 'passed' ? 'Pass' : 'FAIL';
        }
      });
    });
    console.log(`Loaded results from test-results.json (${Object.keys(testResults).length} TCs)`);
  } catch (e) {
    console.warn('Could not parse test-results.json:', e.message);
  }
} else {
  console.warn('No test-results.json found — "Actual Result" column will show "Not Run"');
  console.warn('Run: npm run test:report  to auto-populate results');
}

/** Look up actual result for a TC ID, fallback = 'Not Run' */
const result = (id) => testResults[id] || 'Not Run';

// ─── Column headers ────────────────────────────────────────────────────────────
const TC_HEADERS = [
  'Test Case ID',
  'Function / Module',
  'Test Objective',
  'Input Data',
  'Expected Output',
  'TC Type',        // normal / exception
  'CheckDB',        // Y / N
  'Rollback',       // Y / N
  'Actual Result',  // Pass / FAIL / Not Run  ← auto-populated from jest --json
  'Notes',
];

// ════════════════════════════════════════════════════════════════════════════════
// 1. OVERVIEW
// ════════════════════════════════════════════════════════════════════════════════
const overviewData = [
  ['UNIT TESTING REPORT – INTERNSHIP REGISTRATION MODULE'],
  [],
  ['1.1 Tools & Libraries'],
  ['Item', 'Details'],
  ['Testing Framework', 'Jest v29.x'],
  ['HTTP Testing',      'Supertest v7.x'],
  ['Mocking Library',   'Jest built-in (jest.fn, jest.mock)'],
  ['Runtime',           'Node.js (CommonJS)'],
  ['Run tests',         'npm test  (from server/ directory)'],
  ['Run with coverage', 'npm run test:coverage'],
  ['Run with report',   'npm run test:report'],
  [],
  ['Column Glossary'],
  ['TC Type',  '"normal" = happy-path / success scenario; "exception" = error, edge-case, or validation failure'],
  ['CheckDB',  '"Y" = test mocks at least one db.query call; "N" = DB is never reached (blocked by auth or validation)'],
  ['Rollback', '"Y" = test asserts ROLLBACK is called inside the transaction; "N" = no transaction, or transaction commits successfully'],
  [],
  ['1.2 Scope of Testing'],
  [],
  ['A. FILES / CLASSES UNDER TEST'],
  ['No.', 'Actual File', 'Controller Name (per spec)', 'Reason for Testing'],
  [1, 'src/routes/internship-periods.js',       'internshipPeriodController',      'Core CRUD for internship periods: date-overlap validation, active-status management'],
  [2, 'src/routes/internship-lecturers.js',     'lecturerPeriodController',        'Lecturer-period configuration, batch update, available-slot filtering'],
  [3, 'src/routes/internship-registrations.js', 'studentLecturerRegController',    'Lecturer registration & change: slot checks, registration window, transaction integrity'],
  [4, 'src/routes/internship-registrations.js', 'studentEnterpriseRegController',  'Enterprise preference registration: order validation, prerequisite checks (lecturer reg)'],
  [5, 'src/middleware/validateInternshipPeriod.js', 'validateInternshipPeriod',     'Date-validation middleware used by all POST/PUT routes for internship periods'],
  [],
  ['B. FILES NOT UNIT-TESTED (& REASONS)'],
  ['No.', 'File', 'Reason Not Tested'],
  [1, 'src/config/db.js',           'DB connection layer (mysql2 pool). Fully mocked in all tests; real connection requires integration tests.'],
  [2, 'src/middleware/auth.js',      'Thin wrapper around jwt.verify(). 401/forward behaviour is covered indirectly by all route tests.'],
  [3, 'src/middleware/adminGuard.js','Single-condition role check. Covered indirectly: every admin-route test passes through this middleware.'],
  [4, 'src/routes/period-enterprises.js', 'Outside the 4 specified controllers. Basic CRUD, similar logic to internship-periods.'],
  [5, 'src/routes/internship-registrations.js\n(GET /results, GET /results/export,\nPOST /approve-to-academy)',
     'Complex multi-table logic whose results depend on DB state — better suited to integration tests.\nPUT /preference/:id/status is covered by 2 basic TCs (input validation + 404).'],
  [6, 'src/middleware/upload.js, uploadExcel.js','multer wrappers (third-party library). No standalone unit tests needed.'],
  [7, 'src/middleware/errorHandler.js, superAdminGuard.js', 'Auxiliary middlewares outside testing scope.'],
];

// ════════════════════════════════════════════════════════════════════════════════
// 2. TC-IP – InternshipPeriodController
//    File: src/routes/internship-periods.js
// ════════════════════════════════════════════════════════════════════════════════
const tcIPData = [
  TC_HEADERS,
  // ── getAllPeriods ──────────────────────────────────────────────────────────
  ['TC-IP-001',
   'getAllPeriods\n(GET /api/internship-periods)',
   'Retrieve all internship periods – returns full array',
   'No params; DB returns 2 records',
   'HTTP 200; body.length = 2; body[0].name = "Internship Period HK1 2024"',
   'normal', 'Y', 'N', result('TC-IP-001'), 'Happy path'],

  ['TC-IP-002',
   'getAllPeriods\n(GET /api/internship-periods)',
   'Retrieve all periods – empty table returns empty array',
   'No params; DB returns 0 records',
   'HTTP 200; body = []',
   'exception', 'Y', 'N', result('TC-IP-002'), 'Edge case: empty table'],

  // ── getActivePeriod ────────────────────────────────────────────────────────
  ['TC-IP-003',
   'getActivePeriod\n(GET /api/internship-periods/active)',
   'Get active period – one period exists with is_active = true',
   'No params; DB returns 1 record with is_active = true',
   'HTTP 200; body.id = 1; body.is_active = true',
   'normal', 'Y', 'N', result('TC-IP-003'), 'Happy path'],

  ['TC-IP-004',
   'getActivePeriod\n(GET /api/internship-periods/active)',
   'Get active period – no active period exists',
   'No params; DB returns 0 records',
   'HTTP 404; body.error contains "No active period"',
   'exception', 'Y', 'N', result('TC-IP-004'), 'Error case: no active period'],

  // ── getPeriodById ──────────────────────────────────────────────────────────
  ['TC-IP-005',
   'getPeriodById\n(GET /api/internship-periods/:id)',
   'Get period by ID – ID exists',
   'id = 1; DB returns 1 record',
   'HTTP 200; body.id = 1',
   'normal', 'Y', 'N', result('TC-IP-005'), 'Happy path'],

  ['TC-IP-006',
   'getPeriodById\n(GET /api/internship-periods/:id)',
   'Get period by ID – ID does not exist',
   'id = 999; DB returns 0 records',
   'HTTP 404; body.error contains "Not found"',
   'exception', 'Y', 'N', result('TC-IP-006'), 'Error case: invalid ID'],

  // ── createInternshipPeriod ─────────────────────────────────────────────────
  ['TC-IP-007',
   'createInternshipPeriod\n(POST /api/internship-periods)',
   'Create period – no auth token → 401',
   'Valid body; no Authorization header',
   'HTTP 401',
   'exception', 'N', 'N', result('TC-IP-007'), 'Auth guard: blocked before DB'],

  ['TC-IP-008',
   'createInternshipPeriod\n(POST /api/internship-periods)',
   'Create period – non-admin token → 403',
   'Valid body; Authorization: Bearer <student_token>',
   'HTTP 403',
   'exception', 'N', 'N', result('TC-IP-008'), 'Admin guard: blocked before DB'],

  ['TC-IP-009',
   'createInternshipPeriod\n(POST /api/internship-periods)',
   'Create period – end_date before start_date → 400',
   'start_date = "2025-03-01"; end_date = "2025-01-01"; admin token',
   'HTTP 400; error contains "must be after start date"',
   'exception', 'N', 'N', result('TC-IP-009'), 'validateInternshipPeriod: blocked before DB'],

  ['TC-IP-010',
   'createInternshipPeriod\n(POST /api/internship-periods)',
   'Create period – end_date equals start_date (same day) → 400',
   'start_date = end_date = "2025-01-01"; admin token',
   'HTTP 400; error contains "must be after start date"',
   'exception', 'N', 'N', result('TC-IP-010'), 'Boundary: same-day'],

  ['TC-IP-011',
   'createInternshipPeriod\n(POST /api/internship-periods)',
   'Create period – invalid date format → 400',
   'start_date = "not-a-date"; end_date = "2025-02-28"; admin token',
   'HTTP 400; error contains "invalid"',
   'exception', 'N', 'N', result('TC-IP-011'), 'validateInternshipPeriod: invalid format'],

  ['TC-IP-012',
   'createInternshipPeriod\n(POST /api/internship-periods)',
   'Create period – overlaps with existing period → 400',
   'start/end_date overlaps period id=2; admin token; DB overlap check returns 1 record',
   'HTTP 400; error contains "Cannot create" + conflicting period name',
   'exception', 'Y', 'N', result('TC-IP-012'), 'Validate: date overlap'],

  ['TC-IP-013',
   'createInternshipPeriod\n(POST /api/internship-periods)',
   'Create period successfully – is_active not provided (defaults to false)',
   'body = {name, start_date, end_date, description}; admin token; DB overlap = 0',
   'HTTP 201; body.id = 10; body.message contains "successfully"',
   'normal', 'Y', 'N', result('TC-IP-013'), 'Happy path'],

  ['TC-IP-014',
   'createInternshipPeriod\n(POST /api/internship-periods)',
   'Create period with is_active=true – all other periods must be set inactive',
   'body = {..., is_active:true}; admin token; DB overlap = 0',
   'HTTP 201; db.query called with "UPDATE internship_periods SET is_active = FALSE"',
   'normal', 'Y', 'N', result('TC-IP-014'), 'Business rule: only one active period'],

  // ── updateInternshipPeriod ─────────────────────────────────────────────────
  ['TC-IP-015',
   'updateInternshipPeriod\n(PUT /api/internship-periods/:id)',
   'Update period – end_date <= start_date → 400',
   'id=1; start_date="2025-06-01"; end_date="2025-05-01"; admin token',
   'HTTP 400; error contains "must be after start date"',
   'exception', 'N', 'N', result('TC-IP-015'), 'validateInternshipPeriod: blocked before DB'],

  ['TC-IP-016',
   'updateInternshipPeriod\n(PUT /api/internship-periods/:id)',
   'Update period – overlaps another period (self excluded) → 400',
   'id=1; DB returns overlap with period id=3; admin token',
   'HTTP 400; error contains "Cannot update"',
   'exception', 'Y', 'N', result('TC-IP-016'), 'Validate: overlap (exclude self)'],

  ['TC-IP-017',
   'updateInternshipPeriod\n(PUT /api/internship-periods/:id)',
   'Update period successfully',
   'id=1; valid body; no DB overlap; admin token',
   'HTTP 200; body.message contains "successfully"',
   'normal', 'Y', 'N', result('TC-IP-017'), 'Happy path'],

  ['TC-IP-021',
   'updateInternshipPeriod\n(PUT /api/internship-periods/:id)',
   'Update period with is_active=true – all other periods must be set inactive',
   'id=1; body = {..., is_active:true}; admin token; no DB overlap',
   'HTTP 200; db.query called with "UPDATE internship_periods SET is_active = FALSE WHERE id != ?"',
   'normal', 'Y', 'N', result('TC-IP-021'), 'Business rule: only one active period (update path)'],

  // ── deleteInternshipPeriod ─────────────────────────────────────────────────
  ['TC-IP-018',
   'deleteInternshipPeriod\n(DELETE /api/internship-periods/:id)',
   'Delete period – no token → 401',
   'id=1; no Authorization header',
   'HTTP 401',
   'exception', 'N', 'N', result('TC-IP-018'), 'Auth guard'],

  ['TC-IP-019',
   'deleteInternshipPeriod\n(DELETE /api/internship-periods/:id)',
   'Delete period successfully as admin',
   'id=1; admin token; DB affectedRows=1',
   'HTTP 200; body.message contains "successfully"',
   'normal', 'Y', 'N', result('TC-IP-019'), 'Happy path'],

  ['TC-IP-020',
   'deleteInternshipPeriod\n(DELETE /api/internship-periods/:id)',
   'Delete period – student token → 403',
   'id=1; student token',
   'HTTP 403',
   'exception', 'N', 'N', result('TC-IP-020'), 'Admin guard'],
];

// ════════════════════════════════════════════════════════════════════════════════
// 3. TC-LP – LecturerPeriodController
//    File: src/routes/internship-lecturers.js
// ════════════════════════════════════════════════════════════════════════════════
const tcLPData = [
  TC_HEADERS,
  // ── getLecturersByPeriod ───────────────────────────────────────────────────
  ['TC-LP-001',
   'getLecturersByPeriod\n(GET /api/internship-lecturers)',
   'Get lecturers – missing period_id → 400',
   'No period_id query param',
   'HTTP 400; error contains "Missing period_id"',
   'exception', 'N', 'N', result('TC-LP-001'), 'Validate required param'],

  ['TC-LP-002',
   'getLecturersByPeriod\n(GET /api/internship-lecturers)',
   'Get full lecturer list for valid period_id',
   'period_id=1; DB returns 2 lecturers',
   'HTTP 200; body.length = 2',
   'normal', 'Y', 'N', result('TC-LP-002'), 'Happy path'],

  ['TC-LP-003',
   'getLecturersByPeriod\n(GET /api/internship-lecturers)',
   'Filter lecturers by can_guide=true – query includes can_guide condition',
   'period_id=1; can_guide="true"',
   'HTTP 200; DB query contains "AND lp.can_guide = ?" with value=1',
   'normal', 'Y', 'N', result('TC-LP-003'), 'Filter: can_guide=true'],

  ['TC-LP-004',
   'getLecturersByPeriod\n(GET /api/internship-lecturers)',
   'Filter lecturers by can_guide=false',
   'period_id=1; can_guide="false"',
   'HTTP 200; DB query contains "AND lp.can_guide = ?" with value=0',
   'normal', 'Y', 'N', result('TC-LP-004'), 'Filter: can_guide=false'],

  // ── getAvailableLecturers ──────────────────────────────────────────────────
  ['TC-LP-005',
   'getAvailableLecturers\n(GET /api/internship-lecturers/available)',
   'Get available lecturers – missing period_id → 400',
   'No period_id query param',
   'HTTP 400; error contains "Missing period_id"',
   'exception', 'N', 'N', result('TC-LP-005'), 'Validate required param'],

  ['TC-LP-006',
   'getAvailableLecturers\n(GET /api/internship-lecturers/available)',
   'Get available lecturers – returns lecturers with available_slots > 0',
   'period_id=1; DB returns 1 lecturer with open slots',
   'HTTP 200; body.length = 1; body[0].available_slots > 0',
   'normal', 'Y', 'N', result('TC-LP-006'), 'Happy path'],

  ['TC-LP-007',
   'getAvailableLecturers\n(GET /api/internship-lecturers/available)',
   'Get available lecturers – all lecturers are full',
   'period_id=1; DB returns 0 records',
   'HTTP 200; body = []',
   'exception', 'Y', 'N', result('TC-LP-007'), 'Edge case: all slots full'],

  // ── upsertLecturerPeriod ───────────────────────────────────────────────────
  ['TC-LP-008',
   'upsertLecturerPeriod\n(POST /api/internship-lecturers)',
   'Create lecturer config – no token → 401',
   'body = {period_id, lecturer_id}; no Authorization header',
   'HTTP 401',
   'exception', 'N', 'N', result('TC-LP-008'), 'Auth guard'],

  ['TC-LP-009',
   'upsertLecturerPeriod\n(POST /api/internship-lecturers)',
   'Create lecturer config – missing period_id → 400',
   'body = {lecturer_id:1, can_guide:true}; admin token',
   'HTTP 400; error contains "Missing"',
   'exception', 'N', 'N', result('TC-LP-009'), 'Validate required param'],

  ['TC-LP-010',
   'upsertLecturerPeriod\n(POST /api/internship-lecturers)',
   'Create lecturer config – missing lecturer_id → 400',
   'body = {period_id:1, can_guide:true}; admin token',
   'HTTP 400; error contains "Missing"',
   'exception', 'N', 'N', result('TC-LP-010'), 'Validate required param'],

  ['TC-LP-011',
   'upsertLecturerPeriod\n(POST /api/internship-lecturers)',
   'Create/update lecturer config successfully (INSERT ON DUPLICATE KEY UPDATE)',
   'body = {period_id:1, lecturer_id:1, can_guide:true, max_slots:5}; admin token',
   'HTTP 200; body.message contains "successfully"',
   'normal', 'Y', 'N', result('TC-LP-011'), 'Happy path: UPSERT'],

  ['TC-LP-012',
   'upsertLecturerPeriod\n(POST /api/internship-lecturers)',
   'When max_slots is not provided, defaults to 10',
   'body = {period_id:1, lecturer_id:2, can_guide:true}; admin token',
   'HTTP 200; db.query called with param array containing value 10',
   'normal', 'Y', 'N', result('TC-LP-012'), 'Default value: max_slots=10'],

  // ── batchUpdateLecturers ───────────────────────────────────────────────────
  ['TC-LP-013',
   'batchUpdateLecturers\n(PUT /api/internship-lecturers/batch)',
   'Batch update lecturers – missing period_id → 400',
   'body = {lecturers:[...]}; no period_id; admin token',
   'HTTP 400; error contains "Missing period_id"',
   'exception', 'N', 'N', result('TC-LP-013'), 'Validate required param'],

  ['TC-LP-014',
   'batchUpdateLecturers\n(PUT /api/internship-lecturers/batch)',
   'Batch update lecturers – lecturers is not an array → 400',
   'body = {period_id:1, lecturers:"not-array"}; admin token',
   'HTTP 400; error contains "invalid"',
   'exception', 'N', 'N', result('TC-LP-014'), 'Validate type: must be array'],

  ['TC-LP-015',
   'batchUpdateLecturers\n(PUT /api/internship-lecturers/batch)',
   'Batch update successfully – transaction COMMIT',
   'body = {period_id:1, lecturers:[{id:1,can_guide:true},{id:2,...}]}; admin token',
   'HTTP 200; body.message contains "successfully"; COMMIT is called',
   'normal', 'Y', 'N', result('TC-LP-015'), 'Happy path: transaction commits'],

  ['TC-LP-016',
   'batchUpdateLecturers\n(PUT /api/internship-lecturers/batch)',
   'Batch update – DB error mid-transaction → ROLLBACK',
   'Valid body; first INSERT rejected by DB',
   'HTTP 500; ROLLBACK is called',
   'exception', 'Y', 'Y', result('TC-LP-016'), 'Error path: transaction rollback'],
];

// ════════════════════════════════════════════════════════════════════════════════
// 4. TC-SLR – StudentLecturerRegController
//    File: src/routes/internship-registrations.js
// ════════════════════════════════════════════════════════════════════════════════
const tcSLRData = [
  TC_HEADERS,
  // ── getMyLecturerReg ───────────────────────────────────────────────────────
  ['TC-SLR-001',
   'getMyLecturerReg\n(GET /api/internship-registrations/my-lecturer)',
   'Get student\'s lecturer registration – no token → 401',
   'No Authorization header',
   'HTTP 401',
   'exception', 'N', 'N', result('TC-SLR-001'), 'Auth guard'],

  ['TC-SLR-002',
   'getMyLecturerReg\n(GET /api/internship-registrations/my-lecturer)',
   'Get lecturer registration – student has 1 registration',
   'Student token; DB returns 1 record',
   'HTTP 200; body.length = 1; body[0].status = "approved"',
   'normal', 'Y', 'N', result('TC-SLR-002'), 'Happy path'],

  ['TC-SLR-003',
   'getMyLecturerReg\n(GET /api/internship-registrations/my-lecturer)',
   'Get lecturer registration – student has no registrations',
   'Student token; DB returns 0 records',
   'HTTP 200; body = []',
   'exception', 'Y', 'N', result('TC-SLR-003'), 'Edge case: no registrations'],

  // ── registerLecturer ───────────────────────────────────────────────────────
  ['TC-SLR-004',
   'registerLecturer\n(POST /api/internship-registrations/lecturer)',
   'Register lecturer – no token → 401',
   'body = {period_id:1, lecturer_id:1}; no Authorization header',
   'HTTP 401',
   'exception', 'N', 'N', result('TC-SLR-004'), 'Auth guard'],

  ['TC-SLR-005',
   'registerLecturer\n(POST /api/internship-registrations/lecturer)',
   'Register lecturer – missing period_id → 400',
   'body = {lecturer_id:1}; student token',
   'HTTP 400; error contains "Missing period_id"',
   'exception', 'N', 'N', result('TC-SLR-005'), 'Validate required param'],

  ['TC-SLR-006',
   'registerLecturer\n(POST /api/internship-registrations/lecturer)',
   'Register lecturer – missing lecturer_id → 400',
   'body = {period_id:1}; student token',
   'HTTP 400; error contains "Missing"',
   'exception', 'N', 'N', result('TC-SLR-006'), 'Validate required param'],

  ['TC-SLR-007',
   'registerLecturer\n(POST /api/internship-registrations/lecturer)',
   'Register lecturer – period does not exist or is not active → 400',
   'period_id=99; DB period query returns []',
   'HTTP 400; error contains "not active"',
   'exception', 'Y', 'N', result('TC-SLR-007'), 'Validate: period active'],

  ['TC-SLR-008',
   'registerLecturer\n(POST /api/internship-registrations/lecturer)',
   'Register lecturer – current date outside period registration window → 400',
   'Period is active but end_date = 2020-02-28 (expired); student token',
   'HTTP 400; error contains "Not within registration window"',
   'exception', 'Y', 'N', result('TC-SLR-008'), 'Validate: date window'],

  ['TC-SLR-009',
   'registerLecturer\n(POST /api/internship-registrations/lecturer)',
   'Register lecturer – lecturer has can_guide=false in this period → 400',
   'Period active; lecturer_period.can_guide=false; student token',
   'HTTP 400; error contains "cannot supervise"',
   'exception', 'Y', 'N', result('TC-SLR-009'), 'Validate: can_guide flag'],

  ['TC-SLR-010',
   'registerLecturer\n(POST /api/internship-registrations/lecturer)',
   'Register lecturer – lecturer has no available slots (current = max) → 400',
   'Period active; current_slots=10, max_slots=10; student token',
   'HTTP 400; error contains "no available slots"',
   'exception', 'Y', 'N', result('TC-SLR-010'), 'Validate: slot availability'],

  ['TC-SLR-011',
   'registerLecturer\n(POST /api/internship-registrations/lecturer)',
   'Register lecturer – student re-registers the same lecturer already registered → 400',
   'existing.lecturer_period_id = lecturerPeriodId (same); student token',
   'HTTP 400; error contains "already registered this lecturer"',
   'exception', 'Y', 'N', result('TC-SLR-011'), 'Validate: duplicate registration'],

  ['TC-SLR-012',
   'registerLecturer\n(POST /api/internship-registrations/lecturer)',
   'Register NEW lecturer successfully – INSERT + increment current_slots',
   'Period active; lecturer has slots; student has no prior registration; student token',
   'HTTP 201; message "Lecturer registration successful"; COMMIT called',
   'normal', 'Y', 'N', result('TC-SLR-012'), 'Happy path: new registration'],

  ['TC-SLR-017',
   'changeLecturer\n(POST /api/internship-registrations/lecturer)',
   'Change lecturer – DB error mid-transaction → ROLLBACK',
   'Student has existing reg (LP_ID=5); new lecturer (LP_ID=7); UPDATE registration throws DB Error',
   'HTTP 500; ROLLBACK is called',
   'exception', 'Y', 'Y', result('TC-SLR-017'), 'Error path: change lecturer transaction rollback'],

  // ── changeLecturer ─────────────────────────────────────────────────────────
  ['TC-SLR-013',
   'changeLecturer\n(POST /api/internship-registrations/lecturer)',
   'CHANGE lecturer to another – UPDATE + decrement old slots, increment new slots',
   'Student had old lecturer (LP_ID=5); registers new lecturer (LP_ID=7); student token',
   'HTTP 200; message "Lecturer changed successfully"; COMMIT called',
   'normal', 'Y', 'N', result('TC-SLR-013'), 'Happy path: change lecturer + slot swap'],

  // ── updateLecturerRegStatus ────────────────────────────────────────────────
  ['TC-SLR-014',
   'updateLecturerRegStatus\n(PUT /api/internship-registrations/lecturer/:id/status)',
   'Admin update status – invalid status value → 400',
   'id=1; status="invalid_status"; admin token',
   'HTTP 400; error contains "Invalid status"',
   'exception', 'N', 'N', result('TC-SLR-014'), 'Validate enum status'],

  ['TC-SLR-015',
   'updateLecturerRegStatus\n(PUT /api/internship-registrations/lecturer/:id/status)',
   'Admin approves registration successfully',
   'id=1; status="approved"; notes="Approved"; admin token',
   'HTTP 200; body.message contains "successfully"',
   'normal', 'Y', 'N', result('TC-SLR-015'), 'Happy path: approved'],

  ['TC-SLR-016',
   'updateLecturerRegStatus\n(PUT /api/internship-registrations/lecturer/:id/status)',
   'Admin rejects registration successfully',
   'id=1; status="rejected"; admin token',
   'HTTP 200; body.message contains "successfully"',
   'normal', 'Y', 'N', result('TC-SLR-016'), 'Happy path: rejected'],
];

// ════════════════════════════════════════════════════════════════════════════════
// 5. TC-SER – StudentEnterpriseRegController
//    File: src/routes/internship-registrations.js
// ════════════════════════════════════════════════════════════════════════════════
const tcSERData = [
  TC_HEADERS,
  // ── getMyPreferences ───────────────────────────────────────────────────────
  ['TC-SER-001',
   'getMyPreferences\n(GET /api/internship-registrations/my-preferences)',
   'Get enterprise preferences – no token → 401',
   'No Authorization header',
   'HTTP 401',
   'exception', 'N', 'N', result('TC-SER-001'), 'Auth guard'],

  ['TC-SER-002',
   'getMyPreferences\n(GET /api/internship-registrations/my-preferences)',
   'Get preferences – student has 2 preferences',
   'Student token; DB returns 2 records',
   'HTTP 200; body.length = 2; body[0].preference_order = 1',
   'normal', 'Y', 'N', result('TC-SER-002'), 'Happy path'],

  ['TC-SER-003',
   'getMyPreferences\n(GET /api/internship-registrations/my-preferences)',
   'Get preferences – student has no preferences',
   'Student token; DB returns 0 records',
   'HTTP 200; body = []',
   'exception', 'Y', 'N', result('TC-SER-003'), 'Edge case: no preferences'],

  // ── registerPreferences ────────────────────────────────────────────────────
  ['TC-SER-004',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register enterprise preferences – no token → 401',
   'Valid body; no Authorization header',
   'HTTP 401',
   'exception', 'N', 'N', result('TC-SER-004'), 'Auth guard'],

  ['TC-SER-005',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – missing period_id → 400',
   'body = {preferences:[...]}; student token',
   'HTTP 400; error contains "invalid"',
   'exception', 'N', 'N', result('TC-SER-005'), 'Validate required param'],

  ['TC-SER-006',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – preferences array is empty → 400',
   'body = {period_id:1, preferences:[]}; student token',
   'HTTP 400; error contains "invalid"',
   'exception', 'N', 'N', result('TC-SER-006'), 'Validate: array must not be empty'],

  ['TC-SER-007',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – 6 items, exceeds maximum of 5 → 400',
   'preferences has 6 elements; student token',
   'HTTP 400; error contains "maximum 5"',
   'exception', 'N', 'N', result('TC-SER-007'), 'Validate: max 5 preferences'],

  ['TC-SER-008',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – period not active or not found → 400',
   'period_id=99; DB period query returns []; student token',
   'HTTP 400; error contains "not active"',
   'exception', 'Y', 'N', result('TC-SER-008'), 'Validate: period active'],

  ['TC-SER-009',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – current date outside registration window → 400',
   'Period exists; end_date = 2020-02-28 (expired); student token',
   'HTTP 400; error contains "Not within registration window"',
   'exception', 'Y', 'N', result('TC-SER-009'), 'Validate: date window'],

  ['TC-SER-010',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – student has no lecturer registration (prerequisite) → 400',
   'Period active; lecturer_registrations = []; student token',
   'HTTP 400; error contains "must register a lecturer"',
   'exception', 'Y', 'N', result('TC-SER-010'), 'Business rule: prerequisite lecturer reg'],

  ['TC-SER-011',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – student already has preferences in this period → 400',
   'Period active; has lecturer reg; existing prefs != []; student token',
   'HTTP 400; error contains "already registered preferences"',
   'exception', 'Y', 'N', result('TC-SER-011'), 'Validate: no duplicate submission'],

  ['TC-SER-012',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – non-sequential order (1 and 3, skipping 2) → 400',
   'preferences = [{order:1},{order:3}]; student token',
   'HTTP 400; error contains "Preference order"',
   'exception', 'Y', 'N', result('TC-SER-012'), 'Validate: sequential order 1..N'],

  ['TC-SER-013',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – enterprise not found in period → 500 + ROLLBACK',
   'enterprise_id=99; DB period_enterprises returns [] → throws; ROLLBACK',
   'HTTP 500; error contains "does not exist"; ROLLBACK is called',
   'exception', 'Y', 'Y', result('TC-SER-013'), 'Error + transaction rollback: enterprise not found'],

  ['TC-SER-014',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register preferences – enterprise has no available slots → 500 + ROLLBACK',
   'enterprise current_slots=10, max_slots=10 → throws; ROLLBACK',
   'HTTP 500; error contains "no available slots"; ROLLBACK is called',
   'exception', 'Y', 'Y', result('TC-SER-014'), 'Error + transaction rollback: slot full'],

  ['TC-SER-015',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register 1 preference successfully – INSERT + COMMIT',
   'Period active; lecturer registered; no prior prefs; enterprise has slots; student token',
   'HTTP 201; message contains "successfully"; COMMIT called',
   'normal', 'Y', 'N', result('TC-SER-015'), 'Happy path: 1 preference'],

  ['TC-SER-016',
   'registerPreferences\n(POST /api/internship-registrations/preferences)',
   'Register 3 preferences in order 1-2-3 successfully – 3 INSERTs + COMMIT',
   '3 prefs order=[1,2,3]; 3 distinct enterprises with available slots; student token',
   'HTTP 201; message "successfully"; 3 INSERT db.query calls made',
   'normal', 'Y', 'N', result('TC-SER-016'), 'Happy path: 3 preferences'],

  // ── updatePreferenceStatus ─────────────────────────────────────────────────
  ['TC-SER-019',
   'updatePreferenceStatus\n(PUT /api/internship-registrations/preference/:id/status)',
   'Approve preference – auto-rejects others, increments enterprise slots, COMMIT',
   'id=1; status="approved"; no intern_at_academy; enterprise has slots; admin token',
   'HTTP 200; message contains "successfully"; COMMIT is called',
   'normal', 'Y', 'N', result('TC-SER-019'), 'Happy path: full approve transaction'],

  ['TC-SER-020',
   'updatePreferenceStatus\n(PUT /api/internship-registrations/preference/:id/status)',
   'Approve preference – enterprise slot full inside transaction → 400 + ROLLBACK',
   'id=1; status="approved"; enterprise current_slots=max_slots → 400',
   'HTTP 400; error contains "no available slots"; ROLLBACK is called',
   'exception', 'Y', 'Y', result('TC-SER-020'), 'Error + transaction rollback: slot full on approve'],

  ['TC-SER-021',
   'updatePreferenceStatus\n(PUT /api/internship-registrations/preference/:id/status)',
   'Reject a previously approved preference – decrements enterprise slots + COMMIT',
   'id=1; status="rejected"; oldStatus="approved"; admin token',
   'HTTP 200; message contains "successfully"; slot decremented; COMMIT is called',
   'normal', 'Y', 'N', result('TC-SER-021'), 'Business rule: slot rollback when un-approving'],

  ['TC-SER-017',
   'updatePreferenceStatus\n(PUT /api/internship-registrations/preference/:id/status)',
   'Admin update preference status – invalid status → 400',
   'id=1; status="xyz"; admin token',
   'HTTP 400; error contains "Invalid status"',
   'exception', 'N', 'N', result('TC-SER-017'), 'Validate enum status'],

  ['TC-SER-018',
   'updatePreferenceStatus\n(PUT /api/internship-registrations/preference/:id/status)',
   'Admin update preference status – ID not found → 404',
   'id=999; status="approved"; admin token; DB preference query returns []',
   'HTTP 404; error contains "Not found"',
   'exception', 'Y', 'N', result('TC-SER-018'), 'Error: resource not found'],
];

// ════════════════════════════════════════════════════════════════════════════════
// 6. TC-VIP – validateInternshipPeriod Middleware
//    File: src/middleware/validateInternshipPeriod.js
// ════════════════════════════════════════════════════════════════════════════════
const tcVIPData = [
  TC_HEADERS,
  ['TC-VIP-001',
   'validateInternshipPeriod\n(Middleware – internship-periods.js)',
   'Passes to next() when end_date is after start_date – valid input',
   'start_date="2025-01-01"; end_date="2025-02-28"',
   'HTTP 200; next() is called; route handler returns {success:true}',
   'normal', 'N', 'N', result('TC-VIP-001'), 'Happy path'],

  ['TC-VIP-002',
   'validateInternshipPeriod\n(Middleware – internship-periods.js)',
   'Passes to next() when only start_date is provided (no end_date)',
   'start_date="2025-01-01"; end_date=undefined',
   'HTTP 200; next() is called',
   'normal', 'N', 'N', result('TC-VIP-002'), 'Partial input: single date field'],

  ['TC-VIP-003',
   'validateInternshipPeriod\n(Middleware – internship-periods.js)',
   'Passes to next() when neither date field is provided',
   'body = {name:"Internship 2025"}; no start_date or end_date',
   'HTTP 200; next() is called',
   'normal', 'N', 'N', result('TC-VIP-003'), 'No date fields: skip validation'],

  ['TC-VIP-004',
   'validateInternshipPeriod\n(Middleware – internship-periods.js)',
   'Returns 400 when end_date is before start_date',
   'start_date="2025-03-01"; end_date="2025-01-01"',
   'HTTP 400; error contains "must be after start date"',
   'exception', 'N', 'N', result('TC-VIP-004'), 'Validate: end < start'],

  ['TC-VIP-005',
   'validateInternshipPeriod\n(Middleware – internship-periods.js)',
   'Returns 400 when end_date equals start_date (same day)',
   'start_date = end_date = "2025-01-15"',
   'HTTP 400; error contains "must be after start date"',
   'exception', 'N', 'N', result('TC-VIP-005'), 'Boundary: same-day (end <= start)'],

  ['TC-VIP-006',
   'validateInternshipPeriod\n(Middleware – internship-periods.js)',
   'Returns 400 when start_date has invalid format (NaN)',
   'start_date="not-a-date"; end_date="2025-02-28"',
   'HTTP 400; error contains "invalid"',
   'exception', 'N', 'N', result('TC-VIP-006'), 'Validate: invalid date format'],

  ['TC-VIP-007',
   'validateInternshipPeriod\n(Middleware – internship-periods.js)',
   'Returns 400 when end_date has invalid format',
   'start_date="2025-01-01"; end_date="abc-xyz"',
   'HTTP 400; error contains "invalid"',
   'exception', 'N', 'N', result('TC-VIP-007'), 'Validate: invalid date format'],
];

// ════════════════════════════════════════════════════════════════════════════════
// HELPER: create worksheet with auto column width
// ════════════════════════════════════════════════════════════════════════════════
function makeSheet(data) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const colWidths = [];
  data.forEach(row => {
    row.forEach((cell, ci) => {
      const maxLineLen = cell
        ? String(cell).split('\n').reduce((m, l) => Math.max(m, l.length), 0)
        : 8;
      colWidths[ci] = Math.max(colWidths[ci] || 10, Math.min(maxLineLen + 2, 80));
    });
  });
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  return ws;
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN: build workbook and write file
// ════════════════════════════════════════════════════════════════════════════════
const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(wb, makeSheet(overviewData),  'Overview');
XLSX.utils.book_append_sheet(wb, makeSheet(tcIPData),  'TC-IP (InternshipPeriod)');
XLSX.utils.book_append_sheet(wb, makeSheet(tcLPData),  'TC-LP (LecturerPeriod)');
XLSX.utils.book_append_sheet(wb, makeSheet(tcSLRData), 'TC-SLR (StudentLecturerReg)');
XLSX.utils.book_append_sheet(wb, makeSheet(tcSERData), 'TC-SER (EnterpriseReg)');
XLSX.utils.book_append_sheet(wb, makeSheet(tcVIPData), 'TC-VIP (ValidateMiddleware)');

const outPath = path.join(__dirname, 'UnitTestingReport_InternshipRegistration_v2.xlsx');
XLSX.writeFile(wb, outPath);

console.log('Report generated at:', outPath);

const totalTCs = [tcIPData, tcLPData, tcSLRData, tcSERData, tcVIPData]
  .reduce((sum, arr) => sum + arr.length - 1, 0);

const countByType = (arr) => {
  const rows = arr.slice(1);
  return {
    normal:    rows.filter(r => r[5] === 'normal').length,
    exception: rows.filter(r => r[5] === 'exception').length,
    checkDB_Y: rows.filter(r => r[6] === 'Y').length,
    rollback_Y: rows.filter(r => r[7] === 'Y').length,
  };
};

const all = [...tcIPData.slice(1), ...tcLPData.slice(1), ...tcSLRData.slice(1), ...tcSERData.slice(1), ...tcVIPData.slice(1)];
const normal    = all.filter(r => r[5] === 'normal').length;
const exception = all.filter(r => r[5] === 'exception').length;
const checkDBY  = all.filter(r => r[6] === 'Y').length;
const rollbackY = all.filter(r => r[7] === 'Y').length;

console.log(`Total: ${totalTCs} TCs  |  normal: ${normal}  |  exception: ${exception}  |  CheckDB=Y: ${checkDBY}  |  Rollback=Y: ${rollbackY}`);
console.log('  TC-IP  (InternshipPeriod)   :', tcIPData.length - 1,  JSON.stringify(countByType(tcIPData)));
console.log('  TC-LP  (LecturerPeriod)     :', tcLPData.length - 1,  JSON.stringify(countByType(tcLPData)));
console.log('  TC-SLR (StudentLecturerReg) :', tcSLRData.length - 1, JSON.stringify(countByType(tcSLRData)));
console.log('  TC-SER (EnterpriseReg)      :', tcSERData.length - 1, JSON.stringify(countByType(tcSERData)));
console.log('  TC-VIP (ValidateMiddleware) :', tcVIPData.length - 1, JSON.stringify(countByType(tcVIPData)));
