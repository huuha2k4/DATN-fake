@echo off
echo Starting OCR Service demo...

:: Terminal 1: FastAPI - dung uvicorn trong venv
start "OCR API" cmd /k "cd /d %~dp0 && venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8002"

:: Doi API khoi dong xong (15 giay)
echo Waiting for API to start (15s)...
timeout /t 15 /nobreak > nul

:: Terminal 2: Streamlit - dung streamlit trong venv
start "Streamlit Demo" cmd /k "cd /d %~dp0 && set OCR_API_URL=http://localhost:8002/ocr/receipt && venv\Scripts\streamlit.exe run demo/streamlit_app.py"

echo Done! Open http://localhost:8501 in your browser.
pause
