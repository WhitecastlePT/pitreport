@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set STORE_PASSWORD=uab123
set KEY_PASSWORD=uab123

set APK_OUT=build\app\outputs\flutter-apk\app-release.apk
set AAB_OUT=build\app\outputs\bundle\release\app-release.aab

:: Ler versao do pubspec.yaml via PowerShell
for /f "delims=" %%v in ('powershell -NoProfile -Command "((Select-String -Path \"%~dp0pubspec.yaml\" -Pattern '^version:').Line -replace '^version:\s*','').Trim()"') do set APP_VERSION=%%v

if "%APP_VERSION%"=="" (
    echo ERRO: Nao foi possivel ler a versao do pubspec.yaml.
    pause
    exit /b 1
)

set APK_NAME=pitreport-%APP_VERSION%.apk
set AAB_NAME=pitreport-%APP_VERSION%.aab

echo Versao: %APP_VERSION%

:: ----- APK -----
echo A compilar APK release...
:: Apagar artefacto antigo para nao confundir build falhado com sucesso
if exist "%APK_OUT%" del /F /Q "%APK_OUT%"

call flutter build apk --release
if errorlevel 1 (
    echo.
    echo ERRO: 'flutter build apk' falhou ^(exit code %ERRORLEVEL%^). Nada foi copiado.
    pause
    exit /b 1
)
if not exist "%APK_OUT%" (
    echo.
    echo ERRO: APK nao foi gerado em %APK_OUT%.
    pause
    exit /b 1
)
copy /Y "%APK_OUT%" "build\app\outputs\flutter-apk\%APK_NAME%"

:: ----- AAB -----
echo A compilar App Bundle (Play Store)...
if exist "%AAB_OUT%" del /F /Q "%AAB_OUT%"

call flutter build appbundle --release
if errorlevel 1 (
    echo.
    echo ERRO: 'flutter build appbundle' falhou ^(exit code %ERRORLEVEL%^). AAB nao copiado.
    pause
    exit /b 1
)
if not exist "%AAB_OUT%" (
    echo.
    echo ERRO: AAB nao foi gerado em %AAB_OUT%.
    pause
    exit /b 1
)
copy /Y "%AAB_OUT%" "build\app\outputs\bundle\release\%AAB_NAME%"

echo.
echo BUILD CONCLUIDO COM SUCESSO
echo APK: build\app\outputs\flutter-apk\%APK_NAME%
echo AAB: build\app\outputs\bundle\release\%AAB_NAME%
powershell -NoProfile -Command "Invoke-Item '%~dp0build\app\outputs\bundle\release'"
pause
