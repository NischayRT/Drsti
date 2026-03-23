# focusguard.spec
# Run from python-api/ with: pyinstaller focusguard.spec

import sys
from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs, collect_all

block_cipher = None

# Collect everything from mediapipe and matplotlib — submodules, data, binaries
mp_datas,    mp_binaries,  mp_hiddenimports    = collect_all('mediapipe')
mpl_datas,   mpl_binaries, mpl_hiddenimports   = collect_all('matplotlib')
pil_datas,   pil_binaries, pil_hiddenimports   = collect_all('PIL')
cv2_datas,   cv2_binaries, cv2_hiddenimports   = collect_all('cv2')

a = Analysis(
    ['app.py'],
    pathex=['.'],
    binaries=mp_binaries + mpl_binaries + pil_binaries + cv2_binaries + collect_dynamic_libs('mediapipe'),
    datas=[
        *mp_datas,
        *mpl_datas,
        *pil_datas,
        *cv2_datas,
        # Face landmarker model
        ('face_landmarker.task', '.'),
    ],
    hiddenimports=[
        'mediapipe',
        'mediapipe.tasks',
        'mediapipe.tasks.python',
        'mediapipe.tasks.python.vision',
        'mediapipe.tasks.python.core',
        'mediapipe.tasks.python.vision.drawing_styles',
        'mediapipe.tasks.python.vision.drawing_utils',
        'cv2',
        'numpy',
        'numpy.core',
        'numpy.core._multiarray_umath',
        'flask',
        'flask_cors',
        'werkzeug',
        'werkzeug.serving',
        'werkzeug.debug',
        'matplotlib',
        'matplotlib.pyplot',
        'matplotlib.backends',
        'matplotlib.backends.backend_agg',
        'matplotlib.colors',
        'matplotlib.rcsetup',
        'PIL',
        'PIL.Image',
        'PIL.ImageDraw',
        'PIL.ImageFont',
        'PIL.ImageFilter',
        'PIL.ImageColor',
        'PIL.ImageOps',
        'contourpy',
        'contourpy.util',
        'cycler',
        'pyparsing',
        'dateutil',
        'dateutil.parser',
        'kiwisolver',
        'packaging',
        'packaging.version',
        *mp_hiddenimports,
        *mpl_hiddenimports,
        *pil_hiddenimports,
        *cv2_hiddenimports,
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='focusguard-api',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,      # No terminal window shown to user
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
