from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class LoginPage:
    URL_STUDENT = "/student/login"
    URL_ADMIN = "/admin/login"

    # UI dung Tailwind: error trong div/p .bg-red-50.text-red-600
    ERROR_SELECTOR = ".bg-red-50.text-red-600, [role='alert']"

    def __init__(self, driver, base_url, login_path=None):
        self.driver = driver
        self.base_url = base_url
        self.login_path = login_path or self.URL_STUDENT
        self.wait = WebDriverWait(driver, 10)
        self.short_wait = WebDriverWait(driver, 3)

    def open_student_login(self):
        self.login_path = self.URL_STUDENT
        self.driver.get(self.base_url + self.URL_STUDENT)

    def open_admin_login(self):
        self.login_path = self.URL_ADMIN
        self.driver.get(self.base_url + self.URL_ADMIN)

    def enter_student_code(self, code):
        field = self.wait.until(
            EC.presence_of_element_located((By.NAME, "student_code"))
        )
        field.clear()
        if code:
            field.send_keys(code)

    def enter_email(self, email):
        field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
        field.clear()
        if email:
            field.send_keys(email)

    def enter_password(self, password):
        field = self.driver.find_element(By.NAME, "password")
        field.clear()
        if password:
            field.send_keys(password)

    def click_login(self):
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    def get_error_message(self):
        try:
            msg = self.short_wait.until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, self.ERROR_SELECTOR))
            )
            return msg.text
        except Exception:
            return ""

    def is_redirected_after_login(self):
        """Sau khi login thanh cong, URL khong con chua /login va da chuyen huong."""
        try:
            self.short_wait.until(lambda d: "/login" not in d.current_url)
            return True
        except Exception:
            return False

    # Backward-compatible alias
    def is_redirected_to_dashboard(self):
        return self.is_redirected_after_login()
