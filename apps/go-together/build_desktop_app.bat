@echo off
echo ========================================
echo   Go Together - Desktop App Builder
echo ========================================
echo.

echo Installing required packages...
pip install -r requirements.txt
echo.

echo Building desktop application...
python build_exe.py
echo.

echo ========================================
echo Build complete!
echo.
echo Your app is ready in the 'dist' folder:
echo   - GoTogetherApp.exe
echo.
echo To distribute to others:
echo   1. Copy 'dist\GoTogetherApp.exe'
echo   2. Copy '.env' file
echo   3. Put both in a folder
echo   4. Zip and share!
echo.
echo Read DESKTOP_APP_GUIDE.md for details
echo ========================================
echo.
pause
