@echo off
echo Setting up Visual Studio Build Tools environment...
call "F:\VisualStudio\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
echo Build environment ready!

echo.
echo Checking Android development environment...
echo ANDROID_HOME: %ANDROID_HOME%
echo ANDROID_NDK_ROOT: %NDK_HOME%
echo.

if "%ANDROID_HOME%"=="" (
    echo WARNING: ANDROID_HOME is not set!
    echo Please install Android SDK or set ANDROID_HOME environment variable.
) else (
    echo Android SDK found at: %ANDROID_HOME%
)

if "%NDK_HOME%"=="" (
    echo WARNING: ANDROID_NDK_ROOT is not set!
    echo Please install Android NDK or set ANDROID_NDK_ROOT environment variable.
) else (
    echo Android NDK found at: %NDK_HOME%
)

echo.
echo Checking for Android NDK in common locations...
if exist "%ANDROID_HOME%\ndk" (
    echo Found NDK in Android SDK: %ANDROID_HOME%\ndk
    for /d %%i in ("%ANDROID_HOME%\ndk\*") do echo   - %%i
)

echo.
echo Testing Rust compilation for Windows target...
cd src-tauri
cargo check
cd ..
