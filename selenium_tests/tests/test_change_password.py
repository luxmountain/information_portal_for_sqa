import pytest

from pages.change_password_page import ChangePasswordPage
from config.config import BASE_URL
from tests.accounts import STUDENT_CODE, STUDENT_PASS, NEW_PASS


class TestChangePassword:

    # TC013 - Doi mat khau thanh cong + CheckDB + Rollback
    def test_TC013_change_password_success(self, driver_logged_in, db):
        driver = driver_logged_in

        original = db.query(
            "SELECT password_hash FROM students WHERE student_code=%s",
            (STUDENT_CODE,),
        )
        assert original, f"TC013 FAIL: Khong tim thay sinh vien {STUDENT_CODE} trong DB"
        original_hash = original[0]["password_hash"]

        try:
            page = ChangePasswordPage(driver, BASE_URL)
            page.open()
            page.fill_form(STUDENT_PASS, NEW_PASS, NEW_PASS)
            page.submit()

            success_msg = page.get_success_message()
            assert "thành công" in success_msg.lower() or "thanh cong" in success_msg.lower(), (
                f"TC013 FAIL: UI khong hien thong bao thanh cong: '{success_msg}'"
            )

            new_hash = db.query(
                "SELECT password_hash FROM students WHERE student_code=%s",
                (STUDENT_CODE,),
            )[0]["password_hash"]
            assert new_hash != original_hash, "TC013 FAIL: DB chua cap nhat mat khau moi"
            print("TC013 PASS")
        finally:
            # Luon rollback du test fail, de cac test sau van login duoc
            db.rollback_password(STUDENT_CODE, original_hash)
            print("TC013 | Rollback hoan tat")

    # TC014 - Mat khau hien tai sai
    #
    # Yeu cau (theo spec): Backend tra loi -> UI hien thong bao loi tai cho,
    #                      user van o trang change-password.
    #
    # Thuc te (BUG da phat hien):
    #   - Backend tra HTTP 401 khi sai mat khau hien tai
    #   - axios interceptor (client/src/services/api.js) coi 401 = token expired
    #     -> xoa token -> window.location.href = '/student/login'
    #   - User bi "da" ve trang login, KHONG thay thong bao loi
    #   - Hau qua: UX kem, user mat context, phai dang nhap lai
    #
    # Test nay co tinh de FAIL nham ghi nhan bug. Xem BUGS.md.
    # Khi dev fix (backend tra 400/422 cho loi business, giu 401 cho token issue):
    # test se tu pass khi rerun.
    def test_TC014_wrong_current_password(self, driver_logged_in):
        driver = driver_logged_in
        page = ChangePasswordPage(driver, BASE_URL)
        page.open()
        page.fill_form("WRONG_OLD_PASS", NEW_PASS, NEW_PASS)
        page.submit()
        error = page.get_error_message()
        assert error != "", (
            f"TC014 FAIL [BUG #1]: UI khong hien thong bao loi khi sai mat khau hien tai. "
            f"URL={driver.current_url} (bi axios interceptor da ve login). "
            f"Xem BUGS.md de biet chi tiet."
        )

    # TC016 - Mat khau moi qua ngan
    # Yeu cau: PHAI co bao loi (React error HOAC HTML5 validation),
    # khong duoc submit thanh cong
    def test_TC016_password_too_short(self, driver_logged_in):
        driver = driver_logged_in
        page = ChangePasswordPage(driver, BASE_URL)
        page.open()
        page.fill_form(STUDENT_PASS, "abc", "abc")
        page.submit()

        react_error = page.get_error_message()
        html5_msg = driver.execute_script(
            "var el = document.querySelector('input[name=\"new_password\"]');"
            "return el ? el.validationMessage : '';"
        )
        assert react_error != "" or html5_msg != "", (
            f"TC016 FAIL: Khong co thong bao loi nao khi mat khau qua ngan. "
            f"React='{react_error}', HTML5='{html5_msg}'"
        )

    # TC017 - Confirm password khong khop
    def test_TC017_confirm_mismatch(self, driver_logged_in):
        page = ChangePasswordPage(driver_logged_in, BASE_URL)
        page.open()
        page.fill_form(STUDENT_PASS, NEW_PASS, "DifferentPass99")
        page.submit()
        error = page.get_error_message()
        assert error != "", f"TC017 FAIL: Khong hien loi khi confirm khong khop"
