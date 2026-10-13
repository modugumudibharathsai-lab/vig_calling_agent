"""Browser flow regression for auth, server CAPTCHA, chat, calls, and exports.

Run after installing requirements-test.txt and frontend dependencies, and
install Chromium once with ``python -m playwright install chromium``.
"""
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path
from urllib.request import urlopen

import pytest

ROOT = Path(__file__).resolve().parent


def _free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _wait_for(url, process, timeout=35):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            pytest.fail(f"Development server exited before becoming ready: {url}")
        try:
            with urlopen(url, timeout=1):
                return
        except Exception:
            time.sleep(0.2)
    pytest.fail(f"Development server did not become ready: {url}")


def _solve_captcha(page):
    question = page.locator(".captcha-question").inner_text(timeout=10_000).strip()
    match = re.fullmatch(r"(-?\d+)\s*([+\-×])\s*(-?\d+)\s*=\s*\?", question)
    assert match, f"CAPTCHA question was not displayed: {question!r}"
    left, operator, right = match.groups()
    answer = {"+": lambda: int(left) + int(right), "-": lambda: int(left) - int(right), "×": lambda: int(left) * int(right)}[operator]()
    page.locator("#captcha-answer").fill(str(answer))


@pytest.mark.browser
def test_register_login_chat_call_history_analytics_voice_and_logout():
    playwright = pytest.importorskip("playwright.sync_api")
    expect = playwright.expect
    pnpm = shutil.which("pnpm")
    package_manager = pnpm or shutil.which("npm")
    if not package_manager:
        pytest.skip("pnpm or npm is required to start the Vite browser test server")

    api_port = _free_port()
    web_port = _free_port()
    while web_port == api_port:
        web_port = _free_port()
    api_url = f"http://127.0.0.1:{api_port}"
    web_url = f"http://127.0.0.1:{web_port}"
    temporary_data = tempfile.TemporaryDirectory(prefix="callguardian-browser-")
    env = os.environ.copy()
    env.update({
        "AUTH_COOKIE_SECURE": "false",
        "CALLGUARDIAN_DB_PATH": str(Path(temporary_data.name) / "browser-e2e.db"),
        "CORS_ALLOWED_ORIGINS": web_url,
        "PORT": str(api_port),
        "VITE_API_URL": api_url,
    })
    server_output = subprocess.DEVNULL
    api_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(api_port), "--workers", "1"],
        cwd=ROOT, env=env, stdout=server_output, stderr=server_output,
    )
    web_process = None
    try:
        _wait_for(f"{api_url}/health", api_process)
        vite_args = ["--host", "127.0.0.1", "--port", str(web_port)]
        command = [package_manager, "run", "dev", *vite_args] if pnpm else [package_manager, "run", "dev", "--", *vite_args]
        web_process = subprocess.Popen(
            command,
            cwd=ROOT / "frontend", env=env, stdout=server_output, stderr=server_output,
        )
        _wait_for(web_url, web_process)

        with playwright.sync_playwright() as p:
            try:
                browser = p.chromium.launch(headless=True)
            except Exception as error:
                pytest.skip(f"Install the Playwright Chromium browser to run this test: {error}")
            try:
                context = browser.new_context(accept_downloads=True)
                # Force the browser speech API to fail synchronously so the text
                # fallback and user-facing error can be checked deterministically.
                context.add_init_script("""Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel() {}, speak() { throw new Error('simulated browser speech failure'); }, getVoices() { return []; }, addEventListener() {}, removeEventListener() {} } });""")
                page = context.new_page()
                page.goto(f"{web_url}/register", wait_until="networkidle")
                assert page.locator(".captcha-question").inner_text() != "Challenge unavailable"
                username = f"cgai_{uuid.uuid4().hex[:10]}"
                page.get_by_label("Username").fill(username)
                page.get_by_label("Email address").fill(f"{username}@example.test")
                page.get_by_label("Password", exact=True).fill("FlowTest123!")
                page.get_by_label("Confirm password").fill("FlowTest123!")
                _solve_captcha(page)
                page.get_by_role("button", name="Create secure account").click()
                page.wait_for_url(re.compile(r"/login$"))

                page.get_by_label("Email or username").fill(username)
                page.get_by_label("Password", exact=True).fill("FlowTest123!")
                _solve_captcha(page)
                page.get_by_role("button", name="Sign in securely").click()
                page.wait_for_url(re.compile(r"/dashboard$"))
                expect(page.get_by_role("heading", name="Overview")).to_be_visible()
                assert page.evaluate("performance.getEntriesByType('navigation').length") == 1

                page.get_by_role("link", name="AI assistant").click()
                page.get_by_role("button", name="Start simulation").click()
                page.get_by_role("button", name="Handle with AI").click()
                composer = page.get_by_role("textbox", name="Caller message")
                for turn_number, text in enumerate(("Can you tell me my OTP?", "I also need to share my password"), start=1):
                    composer.fill(text)
                    page.get_by_role("button", name="Send").click()
                    expect(page.locator(".message-assistant .message-bubble")).to_have_count(turn_number)
                expect(page.locator(".message-assistant .message-bubble")).to_have_count(2)
                page.get_by_role("button", name="End & save call").click()
                page.get_by_role("button", name="Transferred", exact=True).click()
                page.wait_for_url(re.compile(r"/calls$"))
                expect(page.locator(".data-table").get_by_text("Transferred", exact=True)).to_be_visible()

                page.locator(".row-open").first.click()
                page.get_by_role("button", name="Listen", exact=False).first.click()
                page.get_by_text("Browser speech could not start", exact=False).wait_for()
                expect(page.get_by_text("For your safety, never share an OTP", exact=False).first).to_be_visible()
                page.get_by_role("link", name="Back to call history").click()

                page.locator(".export-menu summary").click()
                with page.expect_download() as download:
                    page.get_by_role("button", name="Calls CSV").click()
                assert download.value.suggested_filename.endswith(".csv")
                with page.expect_download() as download:
                    page.get_by_role("button", name="JSON archive").click()
                assert download.value.suggested_filename.endswith(".json")

                page.get_by_role("link", name="Analytics").click()
                page.get_by_text("Assistant turns", exact=True).wait_for()
                assert "2" in page.locator(".analytics-metrics .metric-card").nth(1).inner_text()

                page.get_by_role("link", name="Contacts").click()
                page.get_by_label("Name", exact=True).fill("Known test caller")
                page.get_by_label("Phone number").fill("+15550102030")
                page.get_by_role("button", name="Save contact").click()
                page.get_by_role("link", name="AI assistant").click()
                page.locator("#caller-contact").select_option(label="Known test caller · +15550102030")
                page.get_by_label("Agent Mode").check()
                page.get_by_role("button", name="Start simulation").click()
                assert not page.get_by_role("textbox", name="Caller message").is_disabled()
                page.get_by_role("button", name="End & save call").click()
                page.get_by_role("button", name="Declined", exact=True).click()
                page.wait_for_url(re.compile(r"/calls$"))
                expect(page.locator(".data-table").get_by_text("Known test caller", exact=True).first).to_be_visible()

                page.on("dialog", lambda dialog: dialog.accept())
                page.get_by_role("link", name="Settings").click()
                page.wait_for_url(re.compile(r"/settings$"))
                expect(page.locator(".settings-signout")).to_be_visible()
                page.locator(".settings-signout").click()
                page.wait_for_url(re.compile(r"/login$"))
                assert page.evaluate("performance.getEntriesByType('navigation').length") == 1
            finally:
                browser.close()
    finally:
        for process in (web_process, api_process):
            if process and process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
        temporary_data.cleanup()
