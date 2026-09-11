@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  AI 记忆卡片 - 一键发布
echo ========================================
echo.

echo [1/3] 构建项目...
call npm run build
if errorlevel 1 (
    echo [失败] 构建出错，请检查代码。
    pause
    exit /b 1
)
echo [成功] 构建完成。
echo.

echo [2/3] 推送 GitHub (origin)...
git push origin main
if errorlevel 1 (
    echo [警告] GitHub 推送失败（可能网络问题），继续推 Gitee...
) else (
    echo [成功] GitHub 已更新。
)
echo.

echo [3/3] 推送 Gitee (gitee)...
git push gitee main:master
if errorlevel 1 (
    echo [失败] Gitee 推送失败。
) else (
    echo [成功] Gitee 已更新。
)
echo.

echo ========================================
echo  完成！可打开访问：
echo  GitHub:  https://ssing584520.github.io/ai-flashcard/
echo ========================================
timeout /t 5 /nobreak >nul