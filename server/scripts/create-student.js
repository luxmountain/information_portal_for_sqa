/**
 * Usage:
 * node scripts/create-student.js <student_code> <name> <email> <password>
 * Example:
 * node scripts/create-student.js B21DCCN001 "Nguyen Van A" student1@example.com 12345678
 */

require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const args = process.argv.slice(2);
if (args.length < 4) {
  console.error(
    "Usage: node scripts/create-student.js <student_code> <name> <email> <password>",
  );
  process.exit(1);
}

const [student_code, name, email, password] = args;

async function createStudent() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "fit_portal",
    });

    // Check existing
    const [existing] = await connection.query(
      "SELECT id FROM students WHERE student_code = ? OR email = ?",
      [student_code, email],
    );
    if (existing.length > 0) {
      console.error("❌ Student or email already exists");
      process.exit(1);
    }

    const password_hash = await bcrypt.hash(password, 10);

    const phone = "";
    const major_id = null;
    const class_name = "N/A";
    const date_of_birth = "2000-01-01";
    const gpa = 4.0;

    const [result] = await connection.query(
      "INSERT INTO students (student_code, name, email, password_hash, phone, major_id, class_name, date_of_birth, gpa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        student_code,
        name,
        email,
        password_hash,
        phone,
        major_id,
        class_name,
        date_of_birth,
        gpa,
      ],
    );

    console.log("✅ Created student:");
    console.log("  id:", result.insertId);
    console.log("  student_code:", student_code);
    console.log("  email:", email);
  } catch (err) {
    console.error("❌ Error creating student:", err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createStudent();
