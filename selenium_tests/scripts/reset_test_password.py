"""Reset password cho tai khoan test trong DB de Selenium tests login duoc.
Chay: python scripts/reset_test_password.py
"""
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from utils.db_helper import DBHelper
from tests.accounts import STUDENT_CODE, STUDENT_PASS


def main():
    print(f"Reset mat khau cho {STUDENT_CODE} -> '{STUDENT_PASS}'")

    new_hash = bcrypt.hashpw(STUDENT_PASS.encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8")
    print(f"  Hash moi: {new_hash[:25]}...")

    db = DBHelper()
    found = db.query(
        "SELECT id, password_hash FROM students WHERE student_code = %s",
        (STUDENT_CODE,),
    )
    if not found:
        print(f"  LOI: Khong tim thay sinh vien {STUDENT_CODE} trong DB")
        db.close()
        sys.exit(1)

    old_hash = found[0]["password_hash"]
    print(f"  Hash cu:  {old_hash[:25]}...")

    db.cursor.execute(
        "UPDATE students SET password_hash = %s WHERE student_code = %s",
        (new_hash, STUDENT_CODE),
    )
    db.conn.commit()
    print(f"  THANH CONG: Da update {db.cursor.rowcount} row(s)")
    print(f"  -> Bay gio Selenium co the login bang {STUDENT_CODE} / {STUDENT_PASS}")
    db.close()


if __name__ == "__main__":
    main()
