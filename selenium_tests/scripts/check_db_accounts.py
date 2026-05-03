"""Liet ke cac sinh vien & admin co trong DB de chon tai khoan test.
Chay: python scripts/check_db_accounts.py
"""
import io
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.db_helper import DBHelper


def main():
    db = DBHelper()

    print("=" * 60)
    print("STUDENTS (10 dau tien)")
    print("=" * 60)
    students = db.query(
        "SELECT id, student_code, name, email FROM students LIMIT 10"
    )
    if not students:
        print("KHONG CO sinh vien nao trong DB!")
    else:
        for s in students:
            print(f"  id={s['id']:<4} code={s['student_code']:<15} name={s['name']:<25} email={s['email']}")

    target = "SV_TEST_01"
    print()
    print(f"Tim sinh vien co code = '{target}':")
    found = db.query(
        "SELECT id, student_code, name, email, password_hash FROM students WHERE student_code = %s",
        (target,),
    )
    if found:
        s = found[0]
        print(f"  TIM THAY: id={s['id']}, name={s['name']}, hash={s['password_hash'][:20]}...")
        print("  -> Tai khoan ton tai. Neu login van fail, co the password sai.")
    else:
        print(f"  KHONG TIM THAY tai khoan '{target}'")
        print("  -> Sua tests/accounts.py voi student_code thuc su trong DB phia tren.")

    print()
    print("=" * 60)
    print("ADMINS")
    print("=" * 60)
    admins = db.query("SELECT id, email, name, role FROM admins LIMIT 10")
    if not admins:
        print("KHONG CO admin nao!")
    else:
        for a in admins:
            print(f"  id={a['id']:<4} email={a['email']:<30} role={a.get('role', 'N/A')}")

    db.close()


if __name__ == "__main__":
    main()
