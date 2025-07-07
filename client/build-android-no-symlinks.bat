@echo off
echo Building Android app without symbolic links...

REM Force Java 17 for Gradle/Android build
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Setting up Visual Studio Build Tools environment...
call "F:\VisualStudio\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
echo Build environment ready!

echo Setting up Android NDK environment...
REM Check if Android SDK is installed
if not defined ANDROID_HOME (
    echo ERROR: ANDROID_HOME environment variable not set
    echo Please install Android Studio and set ANDROID_HOME
    exit /b 1
)

REM Set up Android NDK
if exist "%ANDROID_HOME%\ndk" (
    for /d %%i in ("%ANDROID_HOME%\ndk\*") do set NDK_HOME=%%i
    echo Using NDK: %NDK_HOME%
) else (
    echo ERROR: Android NDK not found in %ANDROID_HOME%\ndk
    echo Please install Android NDK via Android Studio SDK Manager
    exit /b 1
)

REM Add NDK to PATH
set PATH=%NDK_HOME%\toolchains\llvm\prebuilt\windows-x86_64\bin;%PATH%

REM Configure Rust to use Android NDK linkers
set CC_aarch64_linux_android=%NDK_HOME%\toolchains\llvm\prebuilt\windows-x86_64\bin\aarch64-linux-android21-clang.cmd
set CXX_aarch64_linux_android=%NDK_HOME%\toolchains\llvm\prebuilt\windows-x86_64\bin\aarch64-linux-android21-clang++.cmd
set AR_aarch64_linux_android=%NDK_HOME%\toolchains\llvm\prebuilt\windows-x86_64\bin\llvm-ar.exe
set CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER=%NDK_HOME%\toolchains\llvm\prebuilt\windows-x86_64\bin\aarch64-linux-android21-clang.cmd

echo Using Android NDK clang: %CC_aarch64_linux_android%

echo Step 1: Building Rust library...
cd src-tauri
cargo build --target aarch64-linux-android --release --lib
if %errorlevel% neq 0 (
    echo Failed to build Rust library
    exit /b 1
)

echo Step 2: Creating directories...
mkdir "gen\android\app\src\main\jniLibs\arm64-v8a" 2>nul

echo Step 3: Copying library files...
copy "target\aarch64-linux-android\release\libapp_lib.so" "gen\android\app\src\main\jniLibs\arm64-v8a\libapp_lib.so" /Y
if %errorlevel% neq 0 (
    echo Failed to copy library file
    exit /b 1
)

echo Step 4: Building Android project...
cd gen\android
call gradlew assembleRelease
if %errorlevel% neq 0 (
    echo Failed to build Android project
    exit /b 1
)

echo Step 5: Locating APK...
for /r %%i in (*.apk) do (
    echo APK built successfully: %%i
)

echo Android build completed successfully without symbolic links!
cd ..\..\..
