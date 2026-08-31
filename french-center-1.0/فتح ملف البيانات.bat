@echo off
cd /d "%~dp0"
set "GARAGE_DATA_FILE=%CD%\data\main data 2.xlsx"
if exist "..\02-قاعدة-البيانات\main data 2.xlsx" set "GARAGE_DATA_FILE=%CD%\..\02-قاعدة-البيانات\main data 2.xlsx"
if not exist "%GARAGE_DATA_FILE%" goto missing
start "" "%GARAGE_DATA_FILE%"
exit /b 0

:missing
echo The database file was not found.
pause
exit /b 1
