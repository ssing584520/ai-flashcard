@echo off
chcp 65001 >nul
cd /d "%~dp0"

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo [OK] 开发服务器已在运行，直接打开浏览器...
    start "" "http://localhost:5173/ai-flashcard/"
    exit /b 0
)

echo [启动] 正在启动开发服务器，请稍候...
start "Flashcard Dev Server" cmd /k "cd /d %~dp0 && npm run dev"

echo [等待] 等待服务器就绪...
for /l %%i in (1,1,30) do (
    netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
    if %errorlevel%==0 goto :ready
    timeout /t 1 /nobreak >nul
)
echo [警告] 30秒内未就绪，可能启动失败。
goto :end

:ready
echo [完成] 服务器已就绪，稍后自动打开浏览器...
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173/ai-flashcard/"

:end
echo ----------------------------------------
echo 提示：关闭弹出的黑窗口即可停止服务器。
echo ----------------------------------------
timeout /t 5 /nobreak >nul