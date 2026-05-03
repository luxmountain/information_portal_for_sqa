from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class ChangePasswordPage:
    URL = "/student/change-password"

    SUCCESS_SELECTOR = ".bg-green-50.text-green-600"
    ERROR_SELECTOR = ".bg-red-50.text-red-600, [role='alert']"

    def __init__(self, driver, base_url):
        self.driver = driver
        self.base_url = base_url
        self.wait = WebDriverWait(driver, 10)
        self.short_wait = WebDriverWait(driver, 6)

    def open(self):
        self.driver.get(self.base_url + self.URL)
        self.wait.until(EC.presence_of_element_located((By.NAME, "current_password")))

    def fill_form(self, current, new, confirm):
        cur = self.driver.find_element(By.NAME, "current_password")
        cur.clear()
        if current:
            cur.send_keys(current)
        nw = self.driver.find_element(By.NAME, "new_password")
        nw.clear()
        if new:
            nw.send_keys(new)
        cf = self.driver.find_element(By.NAME, "confirm_password")
        cf.clear()
        if confirm:
            cf.send_keys(confirm)

    def submit(self):
        self.driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    def get_success_message(self):
        try:
            msg = self.wait.until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, self.SUCCESS_SELECTOR))
            )
            return msg.text
        except Exception:
            return ""

    def get_error_message(self):
        try:
            msg = self.short_wait.until(
                EC.visibility_of_element_located((By.CSS_SELECTOR, self.ERROR_SELECTOR))
            )
            return msg.text
        except Exception:
            return ""
