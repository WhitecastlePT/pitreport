@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

set STORE_PASSWORD=uab123
set KEY_PASSWORD=uab123

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
echo A compilar APK release...
call flutter build apk --release

if not exist "build\app\outputs\flutter-apk\app-release.apk" (
    echo Build falhou ou APK nao encontrado.
    pause
    exit /b 1
)
copy /Y "build\app\outputs\flutter-apk\app-release.apk" "build\app\outputs\flutter-apk\%APK_NAME%"

echo A compilar App Bundle (Play Store)...
call flutter build appbundle --release

if not exist "build\app\outputs\bundle\release\app-release.aab" (
    echo Build do AAB falhou.
    pause
    exit /b 1
)
copy /Y "build\app\outputs\bundle\release\app-release.aab" "build\app\outputs\bundle\release\%AAB_NAME%"

echo.
echo APK: build\app\outputs\flutter-apk\%APK_NAME%
echo AAB: build\app\outputs\bundle\release\%AAB_NAME%
powershell -NoProfile -Command "Invoke-Item '%~dp0build\app\outputs\bundle\release'"
pause
