@echo off
setlocal
echo Cierra Cursor por completo antes de continuar.
echo.
pause
node "%~dp0enable-cursor-run-everything.cjs"
if errorlevel 1 (
  echo.
  echo No se pudo aplicar. Asegurate de cerrar Cursor e intenta de nuevo.
  pause
  exit /b 1
)
echo.
echo Listo. Abre Cursor de nuevo.
pause
