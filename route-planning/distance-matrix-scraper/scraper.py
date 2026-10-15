import asyncio, json, csv, re
from pathlib import Path
from playwright.async_api import async_playwright

URL = "https://celadon-biscochitos-10836c.netlify.app/"
OUT = Path(__file__).parent

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        print('Opening:', URL)
        await page.goto(URL, wait_until='networkidle')
        print('\nBrowser opened. Use the site normally and generate the matrix.')
        print('When the matrix is visible, press ENTER here in this terminal.')
        input()

        # Try to find a table containing the matrix.
        tables = await page.locator('table').all()
        matrix = None
        for table in tables:
            rows = await table.locator('tr').all()
            parsed = []
            for row in rows:
                cells = await row.locator('th,td').all()
                vals = [(await c.inner_text()).strip() for c in cells]
                if vals:
                    parsed.append(vals)
            if len(parsed) >= 2 and any(len(r) >= 2 for r in parsed):
                matrix = parsed
                break

        if matrix is None:
            print('No HTML table found. Saving page text for diagnosis...')
            text = await page.locator('body').inner_text()
            (OUT/'page_text.txt').write_text(text, encoding='utf-8')
            await page.screenshot(path=str(OUT/'matrix_page.png'), full_page=True)
            print('Saved page_text.txt and matrix_page.png')
            await browser.close()
            return

        # Normalize rows to equal width.
        width = max(map(len, matrix))
        matrix = [r + ['']*(width-len(r)) for r in matrix]

        with open(OUT/'distance_matrix.csv','w',newline='',encoding='utf-8-sig') as f:
            csv.writer(f).writerows(matrix)
        (OUT/'distance_matrix.json').write_text(json.dumps(matrix, ensure_ascii=False, indent=2), encoding='utf-8')

        print('\nSUCCESS')
        print('Saved: distance_matrix.csv')
        print('Saved: distance_matrix.json')
        print('\nExtracted matrix:')
        for r in matrix:
            print(' | '.join(r))

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
