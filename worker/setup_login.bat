@echo off
REM One-time Instagram login for the discovery worker.
REM A browser window opens -- log into the THROWAWAY IG account, then it saves
REM the session and closes. Only needed once (re-run if session later expires).
cd /d "%~dp0"
echo.
echo A SEPARATE Chrome window (titled "Instagram") will open in a few seconds.
echo If you don't see it, check the taskbar or press Alt+Tab.
echo Log in there (handle any 2FA). This window closes itself when done.
echo.
".venv\Scripts\python.exe" setup_session.py
echo.
echo Done. You can close this window.
pause
