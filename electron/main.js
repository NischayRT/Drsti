const { app, BrowserWindow, ipcMain, Notification, shell } = require('electron')
const path   = require('path')
const { spawn } = require('child_process')
const http   = require('http')
const fs     = require('fs')

const isDev = !app.isPackaged

// Register focusguard:// deep link for OAuth callback
app.setAsDefaultProtocolClient('focusguard')

// Single instance lock — required for deep links on Windows
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

let mainWindow   = null
let splashWindow = null
let apiProcess   = null

// ── Path resolution ──────────────────────────────────────────────────────────
// In dev:  python-api/focusguard-api  (or run manually with python app.py)
// In prod: resources/focusguard-api   (bundled by electron-builder)
function getApiPath() {
  const bin = 'focusguard-api.exe'
  if (isDev) {
    // Dev: binary is in python-api/dist/ relative to project root
    return path.join(__dirname, '..', 'python-api', 'dist', bin)
  }
  // Prod: electron-builder copies it into resources/
  return path.join(process.resourcesPath, bin)
}

// ── Splash window ────────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width:           320,
    height:          260,
    frame:           false,
    transparent:     true,
    resizable:       false,
    alwaysOnTop:     true,
    center:          true,
    backgroundColor: '#080808',
    webPreferences:  { nodeIntegration: false },
  })
  splashWindow.loadFile(path.join(__dirname, 'splash.html'))
}

// ── Main window ──────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width:           1100,
    height:          720,
    minWidth:        860,
    minHeight:       600,
    show:            false,   // hidden until ready
    titleBarStyle:   'hiddenInset',
    backgroundColor: '#080808',
    webPreferences:  {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      false,  // required for file:// asset loading across subdirs
    },
    icon: path.join(__dirname, isDev
      ? '../renderer/public/icon.png'
      : '../resources/icon.png'),
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    // With asar:false, files sit at app/renderer/out/index.html
    const indexPath = path.join(app.getAppPath(), 'renderer', 'out', 'index.html')
    mainWindow.loadFile(indexPath)
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close()
      splashWindow = null
    }
    mainWindow.show()
    mainWindow.focus()
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── Python API launcher ──────────────────────────────────────────────────────
function startPythonApi() {
  const apiPath = getApiPath()

  // If binary doesn't exist, skip — app works without AI
  if (!fs.existsSync(apiPath)) {
    console.log('[API] Binary not found at', apiPath, '— continuing without AI')
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    console.log('[API] Starting:', apiPath)
    apiProcess = spawn(apiPath, [], {
      detached: false,
      stdio:    'ignore',
      env:      { ...process.env, FOCUSGUARD_ENV: 'production' },
    })

    apiProcess.on('error', (err) => {
      console.error('[API] Failed to start:', err)
      resolve() // continue anyway — app works without AI
    })

    // Poll until /health responds or timeout (10s)
    const start   = Date.now()
    const timeout = 10_000
    const interval = setInterval(() => {
      http.get('http://127.0.0.1:5000/health', (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval)
          console.log('[API] Ready')
          resolve()
        }
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          clearInterval(interval)
          console.warn('[API] Timed out — continuing without AI')
          resolve()
        }
      })
    }, 300)
  })
}

function stopPythonApi() {
  if (apiProcess) {
    try {
      process.platform === 'win32'
        ? spawn('taskkill', ['/pid', apiProcess.pid.toString(), '/f', '/t'])
        : apiProcess.kill('SIGTERM')
    } catch (_) {}
    apiProcess = null
  }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Intercept file:// requests — rewrite /_next/ paths to the correct out/ location
  // This fixes asset loading from nested pages like history/index.html
  const { protocol } = require('electron')
  protocol.interceptFileProtocol('file', (request, callback) => {
    let filePath = decodeURIComponent(request.url.replace('file:///', ''))

    // Normalize Windows path
    if (process.platform === 'win32') {
      filePath = filePath.replace(/\//g, '\\')
    }

    // If the path contains _next but the file doesn't exist, rewrite to out root
    const fs = require('fs')
    if (!fs.existsSync(filePath) && filePath.includes('_next')) {
      const outDir = isDev
        ? path.join(__dirname, '..', 'renderer', 'out')
        : path.join(app.getAppPath(), 'renderer', 'out')

      // Extract the _next/... portion and resolve from out/
      const nextIndex = filePath.indexOf('_next')
      if (nextIndex !== -1) {
        const nextPart = filePath.substring(nextIndex)
        const corrected = path.join(outDir, nextPart)
        callback({ path: corrected })
        return
      }
    }

    callback({ path: filePath })
  })

  createSplash()
  await startPythonApi()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('before-quit', () => stopPythonApi())

app.on('window-all-closed', () => {
  stopPythonApi()
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.on('notify-distraction', (_event, { message }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: 'FocusGuard',
      body:  message || 'You drifted — come back!',
    }).show()
  }
})

ipcMain.on('play-nudge', () => shell.beep())

// Open URL in system browser (for OAuth)
ipcMain.on('open-external', (_event, url) => {
  shell.openExternal(url)
})

// Handle OAuth deep link callback: focusguard://auth/callback#access_token=...
app.on('open-url', (_event, url) => {
  if (mainWindow) {
    mainWindow.webContents.send('oauth-callback', url)
  }
})

// Windows: deep link comes via second-instance
app.on('second-instance', (_event, commandLine) => {
  const url = commandLine.find(arg => arg.startsWith('focusguard://'))
  if (url && mainWindow) {
    mainWindow.webContents.send('oauth-callback', url)
    mainWindow.show()
    mainWindow.focus()
  }
})