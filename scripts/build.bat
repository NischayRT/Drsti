@echo off
REM scripts/build.bat - Windows production build
REM Run from project root: scripts\build.bat

echo.
echo === AttentionOS Production Build (Windows) ===
echo.

REM Step 1: Build Next.js
echo [1/3] Building Next.js renderer...
cd renderer
call npm run build
cd ..
echo       Done - renderer/out/
echo.

REM Step 2: Bundle Python API
echo [2/3] Bundling Python API...
cd python-api
call venv\Scripts\activate.bat
pip install pyinstaller --quiet

IF NOT EXIST "face_landmarker.task" (
  echo       Downloading face landmarker model...
  python -c "from gaze_estimator import GazeEstimator; GazeEstimator()"
)

pyinstaller AttentionOS.spec --clean --noconfirm
cd ..
echo       Done - python-api\dist\AttentionOS-api\
echo.

REM Step 3: electron-builder
echo [3/3] Packaging with electron-builder...
call npx electron-builder --win

echo.
echo === Build complete ===
echo Installer saved to: dist\
dir dist\
