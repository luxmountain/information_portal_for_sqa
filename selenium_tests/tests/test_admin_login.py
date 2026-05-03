from pages.login_page import LoginPage
from config.config import BASE_URL
from tests.accounts import ADMIN_EMAIL, ADMIN_PASS


class TestAdminLogin:

    # TC006 - Admin dang nhap thanh cong -> redirect khoi /admin/login
    def test_TC006_valid_admin_login(self, driver):
        page = LoginPage(driver, BASE_URL)
        page.open_admin_login()
        page.enter_email(ADMIN_EMAIL)
        page.enter_password(ADMIN_PASS)
        page.click_login()
        assert page.is_redirected_after_login(), (
            f"TC006 FAIL: Admin khong redirect. URL: {driver.current_url}"
        )

    # TC007 - Email khong ton tai
    def test_TC007_nonexistent_email(self, driver):
        page = LoginPage(driver, BASE_URL)
        page.open_admin_login()
        page.enter_email("notexist_xxx@ptit.edu.vn")
        page.enter_password("any_pass")
        page.click_login()
        error = page.get_error_message()
        assert error != "" and "/admin/login" in driver.current_url, (
            f"TC007 FAIL: Error='{error}', URL={driver.current_url}"
        )

    # TC008 - Sai mat khau admin
    def test_TC008_wrong_admin_password(self, driver):
        page = LoginPage(driver, BASE_URL)
        page.open_admin_login()
        page.enter_email(ADMIN_EMAIL)
        page.enter_password("wrong_password_xxx")
        page.click_login()
        error = page.get_error_message()
        assert error != "" and "/admin/login" in driver.current_url, (
            f"TC008 FAIL: Error='{error}', URL={driver.current_url}"
        )
