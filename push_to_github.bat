@echo off
echo ===================================================
echo   FocusFlow GitHub Push Helper
echo ===================================================
echo.
echo Initializing local Git repository...
git init
echo.
echo Staging all files...
git add .
echo.
echo Committing codebase...
git commit -m "Initialize Next.js To-Do app with Google Sheets database"
echo.
echo Renaming active branch to main...
git branch -M main
echo.
echo Linking GitHub remote repository...
git remote add origin https://github.com/AzkaH14/Vercel-test.git
echo.
echo Pushing codebase to main branch...
git push -u origin main
echo.
echo ===================================================
echo   Push complete! Check https://github.com/AzkaH14/Vercel-test
echo ===================================================
pause
