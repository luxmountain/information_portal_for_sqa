const fs = require("fs");
const path = require("path");

const collectionPath = path.join(__dirname, "../postman_tests/collections/MinhVu_Internship.json");
const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));
const reportPath = path.join(__dirname, "../postman_tests/reports/results.json");

// ─── Phân loại item ────────────────────────────────────────────────────────────

function isSetupItem(name) {
  return (
    name.includes("[SETUP") ||
    name.includes("[AUTH-SETUP") ||
    name.includes("-SETUP-") ||
    /^\[(?:ADMIN|RESULT|BVA\d+)-SETUP/.test(name)
  );
}

function isRollbackItem(name) {
  return name.includes("[ROLLBACK");
}

function isTeardownItem(name) {
  return name.includes("[TEARDOWN") || name.includes("-TEARDOWN]");
}

function isInfraItem(name) {
  return isSetupItem(name) || isRollbackItem(name) || isTeardownItem(name);
}

// ─── Tiện ích ──────────────────────────────────────────────────────────────────

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

// Trích TC-ID từ tên item, ví dụ "TC-PERIOD-03: ..." → "TC-PERIOD-03"
function extractTcId(name) {
  const m = name.match(/TC-[A-Z]+(?:-[A-Z]+)*-\d+/i);
  return m ? m[0].toUpperCase() : null;
}

// ─── Duyệt collection ──────────────────────────────────────────────────────────

/**
 * Trả về danh sách test case thực (không có SETUP/ROLLBACK/TEARDOWN).
 * Mỗi TC lưu thêm `parentGroup` (tên folder cha trực tiếp) để ghép với teardown.
 */
function extractTestCases(items, state = { idx: 1 }, parents = []) {
  const result = [];
  if (!items) return result;

  for (const item of items) {
    const name = item.name || "";

    if (item.item && item.item.length > 0) {
      result.push(...extractTestCases(item.item, state, [...parents, name]));
      continue;
    }

    if (!item.request || isInfraItem(name)) continue;

    const req = item.request;
    const method = req.method || "";

    let endpoint = "";
    if (req.url) {
      if (typeof req.url === "string") {
        endpoint = req.url.replace("{{baseUrl}}", "").replace(/^\/api/, "");
      } else if (req.url.path) {
        endpoint = "/" + req.url.path.join("/");
      }
    }

    let body = "";
    if (req.body?.mode === "raw") body = req.body.raw || "";

    // Đọc expected status từ test script
    let expectedStatus = "200";
    for (const evt of item.event || []) {
      if (evt.listen === "test" && evt.script?.exec) {
        const src = evt.script.exec.join("\n");
        if (src.includes("have.status(201)")) { expectedStatus = "201"; break; }
        if (src.includes("have.status(400)")) { expectedStatus = "400"; break; }
        if (src.includes("have.status(401)")) { expectedStatus = "401"; break; }
        if (src.includes("have.status(403)")) { expectedStatus = "403"; break; }
        if (src.includes("have.status(404)")) { expectedStatus = "404"; break; }
      }
    }

    const tcType = name.includes("BVA") ? "BVA" : "Functional";
    const parentGroup = parents[parents.length - 1] || "";

    result.push({
      ttId: state.idx++,
      name,
      tcId: extractTcId(name),
      apiEndpoint: endpoint,
      method,
      inputBody: body.substring(0, 120),
      expectedOutput: `Status ${expectedStatus}`,
      tcType,
      checkResponse: expectedStatus,
      parentGroup,
    });
  }

  return result;
}

/**
 * Thu thập tên của tất cả ROLLBACK và TEARDOWN, kèm parentGroup,
 * để sau này tra cứu kết quả Newman.
 *
 * rollbackByTcId: Map<tcId, rollbackItemName>
 * teardownByGroup: Map<parentGroup, teardownItemName>
 */
function collectInfraNames(items, maps = { rollbackByTcId: new Map(), teardownByGroup: new Map() }, parents = []) {
  if (!items) return maps;

  for (const item of items) {
    const name = item.name || "";

    if (item.item && item.item.length > 0) {
      collectInfraNames(item.item, maps, [...parents, name]);
      continue;
    }

    const parentGroup = parents[parents.length - 1] || "";

    if (isRollbackItem(name)) {
      const tcId = extractTcId(name);
      if (tcId) maps.rollbackByTcId.set(tcId, name);
    } else if (isTeardownItem(name)) {
      if (!maps.teardownByGroup.has(parentGroup)) {
        maps.teardownByGroup.set(parentGroup, name);
      }
    }
  }

  return maps;
}

// ─── Newman report ─────────────────────────────────────────────────────────────

function loadReport() {
  if (!fs.existsSync(reportPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch (e) {
    console.warn(`⚠️  Cannot read Newman report: ${e.message}`);
    return null;
  }
}

function firstError(execution) {
  return execution.assertions?.find((a) => a.error)?.error?.message || "";
}

/**
 * Xây summary từ Newman report.
 * Trả về:
 *   tcSummary:       Map<itemName, {passed, failed, firstError}>
 *   rollbackSummary: Map<itemName, {passed, failed, firstError}>
 *   teardownSummary: Map<itemName, {passed, failed, firstError}>
 */
function buildSummaries(report) {
  const tcSummary = new Map();
  const rollbackSummary = new Map();
  const teardownSummary = new Map();

  for (const exec of report?.run?.executions || []) {
    const name = exec.item?.name || "";
    if (isSetupItem(name)) continue;

    let map;
    if (isRollbackItem(name)) map = rollbackSummary;
    else if (isTeardownItem(name)) map = teardownSummary;
    else map = tcSummary;

    if (!map.has(name)) map.set(name, { passed: 0, failed: 0, firstError: "" });
    const s = map.get(name);
    const failed = exec.assertions?.some((a) => a.error);
    if (failed) {
      s.failed += 1;
      if (!s.firstError) s.firstError = firstError(exec);
    } else {
      s.passed += 1;
    }
  }

  return { tcSummary, rollbackSummary, teardownSummary };
}

// ─── Xây cột Note ──────────────────────────────────────────────────────────────

function buildNote(tc, summaries, infraNames) {
  if (!summaries) return "";

  const { tcSummary, rollbackSummary, teardownSummary } = summaries;
  const { rollbackByTcId, teardownByGroup } = infraNames;
  const parts = [];

  // TC result
  const s = tcSummary.get(tc.name);
  if (!s) {
    parts.push("No Newman result yet");
  } else if (s.failed === 0) {
    parts.push(`Newman: pass (${s.passed}/${s.passed})`);
  } else {
    const total = s.passed + s.failed;
    parts.push(`Newman: fail (${s.failed}/${total})`);
    if (s.firstError) parts.push(s.firstError);
  }

  // Rollback failure for this TC
  if (tc.tcId) {
    const rollbackName = rollbackByTcId.get(tc.tcId);
    if (rollbackName) {
      const rb = rollbackSummary.get(rollbackName);
      if (rb && rb.failed > 0) {
        parts.push(`Rollback failed at: ${rollbackName}`);
      }
    }
  }

  // Teardown failure for this group
  const teardownName = teardownByGroup.get(tc.parentGroup);
  if (teardownName) {
    const td = teardownSummary.get(teardownName);
    if (td && td.failed > 0) {
      parts.push(`Teardown failed at: ${teardownName}`);
    }
  }

  return parts.join(" | ");
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const testCases = extractTestCases(collection.item);
const infraNames = collectInfraNames(collection.item);
const report = loadReport();
const summaries = report ? buildSummaries(report) : null;

const header = "TT ID,API Endpoint,Method,Testing Objective,Input / Body,Expected Output,TC Type,Check Response,CheckDB,Rollback,Notes / Techniques,Result\n";

const rows = testCases.map((tc) => {
  const s = summaries?.tcSummary.get(tc.name);
  const result = s ? (s.failed > 0 ? "Fail" : "Pass") : "";
  const note = buildNote(tc, summaries, infraNames);

  return [
    tc.ttId,
    tc.apiEndpoint,
    tc.method,
    csvEscape(tc.name),
    csvEscape(tc.inputBody),
    csvEscape(tc.expectedOutput),
    csvEscape(tc.tcType),
    csvEscape(tc.checkResponse),
    csvEscape("No"),
    csvEscape(tc.tcId && infraNames.rollbackByTcId.has(tc.tcId) ? "Yes" : "No"),
    csvEscape(note),
    csvEscape(result),
  ].join(",");
});

const csvContent = header + rows.join("\n") + "\n";

const csvPath = path.join(__dirname, "../postman_tests/test_cases_tracking.csv");
const tmpPath  = path.join(__dirname, "../postman_tests/test_cases_tracking.generated.csv");

fs.writeFileSync(tmpPath, "﻿" + csvContent, "utf8");

try {
  if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
  fs.renameSync(tmpPath, csvPath);
  console.log(`✅ CSV created: ${csvPath}`);
} catch (e) {
  console.warn(`⚠️  Cannot overwrite (file open?): ${e.message}`);
  console.warn(`📄 Temp file at: ${tmpPath}`);
}

console.log(`📊 Total TCs (excluding SETUP/ROLLBACK/TEARDOWN): ${testCases.length}`);
console.log(`🔁 Rollbacks tracked: ${infraNames.rollbackByTcId.size}`);
console.log(`🧹 Teardowns tracked: ${infraNames.teardownByGroup.size}`);
