from playwright.sync_api import sync_playwright
import sys

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Listen for console messages
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

        try:
            print("Navigating to http://localhost:5173...")
            # Use shorter timeout, we expect it to be fast now
            page.goto('http://localhost:5173', wait_until='load', timeout=10000)
            print("Page loaded. Content length:", len(page.content()))
            
            # Check for specific app elements
            root_html = page.inner_html("#root")
            print("Root HTML content length:", len(root_html))
            if len(root_html) < 100:
                print("Root HTML snippet:", root_html)
            
        except Exception as e:
            print(f"Action failed: {e}")
        
        browser.close()

if __name__ == "__main__":
    run()
