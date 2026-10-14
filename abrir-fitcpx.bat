@echo off
title FitCPX Lite - servidor local (feche esta janela para desligar)
cd /d "%~dp0"
set PORT=8080

set PY=
python --version >nul 2>&1 && set PY=python
if not defined PY py --version >nul 2>&1 && set PY=py
if not defined PY goto semPython

echo.
echo  FitCPX Lite rodando em http://localhost:%PORT%
echo  Para desligar: feche esta janela.
echo.
rem Abre no Chrome (se estiver instalado); senao, no navegador padrao do Windows.
set CHROME=
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if defined CHROME goto abrirChrome
start "" cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%"
goto servir
:abrirChrome
start "" cmd /c "timeout /t 2 >nul & "%CHROME%" http://localhost:%PORT%"
:servir
%PY% servidor-local.py %PORT%
goto :eof

:semPython
echo.
echo  Python nao encontrado neste computador.
echo  Instale em https://www.python.org/downloads/
echo  (marque "Add python.exe to PATH" na instalacao) e rode este atalho de novo.
echo.
pause
