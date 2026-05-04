// Usage: node scripts/update-student-password.js <student_code> <new_password>
require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: node scripts/update-student-password.js <student_code> <new_password>",
  );
  process.exit(1);
}

const [student_code, newPassword] = args;

(async function () {
  let conn;
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "fit_portal",
    });
    conn = await pool.getConnection();
    const hash = await bcrypt.hash(newPassword, 10);
    const [result] = await conn.execute(
      "UPDATE students SET password_hash = ? WHERE student_code = ?",
      [hash, student_code],
    );
    console.log("Updated rows:", result.affectedRows);
    conn.release();
  } catch (err) {
    console.error("Error:", err.message);
    if (conn) conn.release();
    process.exit(1);
  }
})();
