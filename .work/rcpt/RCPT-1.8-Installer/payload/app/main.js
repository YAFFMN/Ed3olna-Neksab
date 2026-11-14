const { app, BrowserWindow, Menu, shell, ipcMain, safeStorage, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { chat } = require('./llm');

/* API key: encrypted with the OS (DPAPI / Keychain / libsecret) via safeStorage. If OS encryption is
   unavailable the key is kept in memory only and never written to disk. */
let memKey = null;
const keyFile = () => path.join(app.getPath('userData'), 'nova-key.bin');
function loadKey() {
  if (memKey) return memKey;
  try {
    if (safeStorage.isEncryptionAvailable() && fs.existsSync(keyFile())) return safeStorage.decryptString(fs.readFileSync(keyFile()));
  } catch (e) {}
  return null;
}
ipcMain.handle('nova:hasKey', () => ({ has: !!loadKey(), encrypted: safeStorage.isEncryptionAvailable() && !memKey }));
ipcMain.handle('nova:saveKey', (e, k) => {
  k = String(k || '').trim(); if (!k) return false;
  if (safeStorage.isEncryptionAvailable()) { fs.writeFileSync(keyFile(), safeStorage.encryptString(k)); memKey = null; }
  else memKey = k;
  return true;
});
ipcMain.handle('nova:clearKey', () => { memKey = null; try { fs.unlinkSync(keyFile()); } catch (e) {} return true; });
ipcMain.handle('nova:chat', (e, req) => chat(req || {}, loadKey()));

/* Space-weather feed (NOAA SWPC). Only fetched when the user asks (button) or enables auto-refresh; cached on disk for offline use. */
let swx = null;
ipcMain.handle('data:swpc', (e, opt) => {
  if (!swx) swx = require('./spaceweather').create(app.getPath('userData'));
  return swx.get({ refresh: !!(opt && opt.refresh) });
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#02050a',
    title: 'RCPT - Radiation-Coupled Physiological Twin',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.js') }
  });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  // Only the microphone (push-to-talk) and the camera (optical assessment, on demand) may be requested; everything else is denied.
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permission === 'media'));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'RCPT', submenu: [
      { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' },
      { role: 'reload' },
      { role: 'quit' }
    ] }
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
