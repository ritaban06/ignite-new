@echo off
echo Setting up Visual Studio Build Tools environment...
call "F:\VisualStudio\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
echo Build environment ready!

echo Checking installed Rust targets...
cd src-tauri
rustup target list --installed
echo.
echo Installing Android target if not present...
rustup target add aarch64-linux-android
echo.
echo Testing Windows Rust compilation...
cargo check
cd ..
