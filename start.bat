@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 技能星圖 本機伺服器

where node >nul 2>&1
if errorlevel 1 (
  echo 找不到 node。請先安裝 Node.js，或在 ServBay 啟用 Node.js 後再執行。
  pause
  exit /b 1
)

rem 已經在跑就只開頁面，不重複啟動
netstat -ano | findstr /c:"127.0.0.1:8765" | findstr /c:"LISTENING" >nul
if not errorlevel 1 (
  echo 伺服器已在執行，直接開啟頁面。
  start "" "http://127.0.0.1:8765/mcp.html"
  exit /b 0
)

rem 等伺服器起來再開瀏覽器
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:8765/mcp.html'"

echo 正在啟動技能星圖：http://127.0.0.1:8765
echo 關閉這個視窗即停止伺服器。
echo.
node server.mjs
echo.
echo 伺服器已停止。
pause
