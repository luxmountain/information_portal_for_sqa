import mysql.connector
from config.config import DB_CONFIG


class DBHelper:
    def __init__(self):
        self.conn = mysql.connector.connect(**DB_CONFIG, autocommit=True)
        # READ COMMITTED de moi query thay du lieu moi nhat
        # (tranh REPEATABLE READ snapshot trong cung 1 transaction)
        cur = self.conn.cursor()
        cur.execute("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED")
        cur.close()
        self.cursor = self.conn.cursor(dictionary=True)

    def query(self, sql, params=None):
        # Commit truoc moi query de reset snapshot
        self.conn.commit()
        self.cursor.execute(sql, params or ())
        return self.cursor.fetchall()

    def rollback_password(self, student_code, original_hash):
        """Khoi phuc mat khau sau test"""
        self.cursor.execute(
            "UPDATE students SET password_hash = %s WHERE student_code = %s",
            (original_hash, student_code),
        )
        self.conn.commit()

    def delete_reset_token(self, email):
        """Xoa token reset sau test"""
        self.cursor.execute(
            "DELETE FROM password_reset_tokens WHERE student_id = "
            "(SELECT id FROM students WHERE email = %s)",
            (email,),
        )
        self.conn.commit()

    def close(self):
        self.cursor.close()
        self.conn.close()
