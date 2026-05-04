/*
  Script: ensure_auth_sync.js
  - Reads Postman local_env.json for admin/student credentials
  - Verifies admin and student exist in DB and bcrypt.compare the password
  - If missing or password mismatch, inserts or updates records with bcrypt hash
  - Prints status for each account

  Usage: node scripts/ensure_auth_sync.js
*/

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  const envPath = path.join(
    __dirname,
    "../postman_tests/environments/local_env.json",
  );
  const env = JSON.parse(fs.readFileSync(envPath, "utf8"));
  const getVal = (key) => {
    const v = env.values.find((x) => x.key === key);
    return v ? v.value : undefined;
  };

  const adminEmail = getVal("adminEmail");
  const adminPassword = getVal("adminPassword");
  const studentCode = getVal("studentCode");
  const studentPassword = getVal("studentPassword");

  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "fit_portal",
  });

  const conn = await pool.getConnection();
  try {
    // Admin
    const [admins] = await conn.execute(
      "SELECT id, email, password_hash FROM admins WHERE email = ?",
      [adminEmail],
    );
    if (!admins.length) {
      const pwHash = await bcrypt.hash(adminPassword, 10);
      const [r] = await conn.execute(
        "INSERT INTO admins (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        ["Admin User", adminEmail, pwHash, "admin"],
      );
      console.log(`Admin created (id=${r.insertId}) with email=${adminEmail}`);
    } else {
      const admin = admins[0];
      const match = await bcrypt.compare(adminPassword, admin.password_hash);
      if (!match) {
        const pwHash = await bcrypt.hash(adminPassword, 10);
        await conn.execute("UPDATE admins SET password_hash = ? WHERE id = ?", [
          pwHash,
          admin.id,
        ]);
        console.log(`Admin password updated for email=${adminEmail}`);
      } else {
        console.log(`Admin exists and password OK for email=${adminEmail}`);
      }
    }

    // Student
    const [students] = await conn.execute(
      "SELECT id, student_code, email, password_hash FROM students WHERE student_code = ?",
      [studentCode],
    );
    if (!students.length) {
      const pwHash = await bcrypt.hash(studentPassword, 10);
      const phone = "";
      const major_id = null;
      const class_name = "N/A";
      const date_of_birth = "2000-01-01";
      const gpa = 4.0;
      const [r] = await conn.execute(
        "INSERT INTO students (student_code, name, email, password_hash, phone, major_id, class_name, date_of_birth, gpa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          studentCode,
          "Test Student",
          `${studentCode.toLowerCase()}@example.com`,
          pwHash,
          phone,
          major_id,
          class_name,
          date_of_birth,
          gpa,
        ],
      );
      console.log(
        `Student created (id=${r.insertId}) student_code=${studentCode}`,
      );
    } else {
      const student = students[0];
      const match = await bcrypt.compare(
        studentPassword,
        student.password_hash,
      );
      if (!match) {
        const pwHash = await bcrypt.hash(studentPassword, 10);
        await conn.execute(
          "UPDATE students SET password_hash = ? WHERE id = ?",
          [pwHash, student.id],
        );
        console.log(`Student password updated for student_code=${studentCode}`);
      } else {
        console.log(
          `Student exists and password OK for student_code=${studentCode}`,
        );
      }
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

main();
