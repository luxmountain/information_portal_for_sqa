import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from config.config import BASE_URL
from utils.db_helper import DBHelper


def _build_driver(headless: bool = False):
    """Tao driver. Mac dinh dung Edge (co san tren Win10).
    Set BROWSER=chrome de chuyen sang Chrome.
    Selenium 4.6+ tu lo driver thong qua Selenium Manager."""
    browser = os.getenv("BROWSER", "edge").lower()
    headless = headless or os.getenv("HEADLESS") == "1"

    if browser == "chrome":
        options = webdriver.ChromeOptions()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        driver = webdriver.Chrome(options=options)
    else:
        options = webdriver.EdgeOptions()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        driver = webdriver.Edge(options=options)

    driver.maximize_window()
    return driver


@pytest.fixture(scope="function")
def driver():
    d = _build_driver()
    yield d
    d.quit()


@pytest.fixture(scope="module")
def db():
    helper = DBHelper()
    yield helper
    helper.close()


@pytest.fixture(scope="function")
def driver_logged_in():
    """Driver da login san voi tai khoan student tu tests/accounts.py"""
    from config.config import BASE_URL as URL
    from tests.accounts import STUDENT_CODE, STUDENT_PASS

    d = _build_driver()
    d.get(URL + "/student/login")
    wait = WebDriverWait(d, 10)
    wait.until(EC.presence_of_element_located((By.NAME, "student_code"))).send_keys(
        STUDENT_CODE
    )
    d.find_element(By.NAME, "password").send_keys(STUDENT_PASS)
    d.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    # Login thanh cong khi URL khong con chua /login
    wait.until(lambda drv: "/login" not in drv.current_url)
    yield d
    d.quit()
