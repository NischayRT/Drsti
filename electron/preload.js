const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Distraction / refocus notifications
  notifyDistraction: (message) => ipcRenderer.send('notify-distraction', { message }),
  notifyRefocus:     (message) => ipcRenderer.send('notify-refocus',     { message }),
  playNudge:         ()        => ipcRenderer.send('play-nudge'),

  // Open URL in system browser (OAuth)
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Listen for OAuth deep link callback
  onOAuthCallback:     (cb) => ipcRenderer.on('oauth-callback', (_e, url) => cb(url)),
  removeOAuthListener: ()   => ipcRenderer.removeAllListeners('oauth-callback'),
})