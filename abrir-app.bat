@echo off
echo.
echo ========================================
echo   SISTEMA DE GESTION DE PEDIDOS
echo ========================================
echo.
echo Abriendo aplicacion en el navegador...
echo.

REM Abrir el archivo HTML en el navegador predeterminado
start "" "%~dp0index.html"

echo ✅ Aplicacion abierta exitosamente!
echo.
echo NOTA: La aplicacion funciona completamente
echo sin necesidad de servidor para la demo.
echo.
echo Para conectar a una API real, usa el
echo boton de Configuracion en la aplicacion.
echo.
pause
