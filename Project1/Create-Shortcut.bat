@echo off
echo Creating Desktop Shortcut for NexBuy...

set SCRIPT_DIR=%~dp0
set DESKTOP=%USERPROFILE%\Desktop

:: Create shortcut on desktop
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%DESKTOP%\NexBuy.lnk');$s.TargetPath='%SCRIPT_DIR%RUN.bat';$s.WorkingDirectory='%SCRIPT_DIR%';$s.IconLocation='%SystemRoot%\System32\SHELL32.dll,43';$s.Description='NexBuy - The Future of Shopping';$s.Save()"

echo.
echo ✓ Shortcut created on Desktop!
echo.
echo You can now double-click "NexBuy" on your desktop to start the application.
echo.
pause
