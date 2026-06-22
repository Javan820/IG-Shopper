@echo off
REM Runs the discovery worker, appending all output to worker.log.
REM Normally launched hidden by launch_worker_hidden.vbs (no window).
cd /d "%~dp0"
echo [%date% %time%] worker starting >> worker.log
".venv\Scripts\python.exe" discovery_worker.py >> worker.log 2>&1
echo [%date% %time%] worker exited >> worker.log
