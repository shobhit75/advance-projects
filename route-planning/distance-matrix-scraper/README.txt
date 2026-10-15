DISTANCE MATRIX SCRAPER - WINDOWS

1. Install Python 3.11+ from python.org and tick "Add Python to PATH".
2. Put this folder anywhere, e.g. C:\distance_scraper
3. Double-click run_scraper.bat
4. A Chromium browser opens your Netlify site.
5. On the website, choose the city, select the areas, and generate the Distance Map.
6. Leave the matrix visible.
7. Return to the black terminal window and press ENTER.
8. The scraper saves distance_matrix.csv and distance_matrix.json in this folder.

If no table is detected, it saves page_text.txt and matrix_page.png for diagnosis.

NOTE: This starter version deliberately lets you operate the site's controls manually because the exact control structure can change. Once the matrix extraction is confirmed, the next version can automate city/area selection and collect all combinations.
