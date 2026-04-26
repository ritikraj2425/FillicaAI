import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleStartAgent, handleCancelAgent, handleUserSubmit } from './playwright/agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow;

/**
 * Create the main Electron window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
    },
  });

  // Load the Next.js static export
  const startUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../frontend/out/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Register the fillica:// custom protocol for OAuth redirects
 */
function registerDeepLinkProtocol() {
  protocol.registerStringProtocol('fillica', (request, callback) => {
    const url = new URL(request.url);

    if (url.pathname === 'login-success') {
      const token = url.searchParams.get('token');
      const user = url.searchParams.get('user');

      if (mainWindow) {
        // Send the token to the renderer via IPC
        mainWindow.webContents.send('deep-link-auth', { token, user });
      }

      // Respond to the protocol handler
      callback({
        mimeType: 'text/html',
        data: Buffer.from('<html><body>Login successful! You can close this window.</body></html>'),
      });
    } else {
      callback({ error: -2 }); // FILE_NOT_FOUND
    }
  });
}

/**
 * App ready
 */
app.on('ready', () => {
  registerDeepLinkProtocol();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * IPC Handlers for Playwright Automation
 */
ipcMain.handle('playwright:start', async (event, data) => {
  const { jobId, userId } = data;
  try {
    // Pass the socket-like event object for status updates
    const result = await handleStartAgent(event, { jobId, userId });
    return result;
  } catch (err) {
    console.error('[Agent] Fatal error:', err);
    throw err;
  }
});

ipcMain.handle('playwright:cancel', async (event, data) => {
  const { jobId, userId } = data;
  try {
    await handleCancelAgent(event, { jobId, userId });
  } catch (err) {
    console.error('[Agent] Cancel error:', err);
    throw err;
  }
});

ipcMain.handle('playwright:submit', async (event, data) => {
  try {
    await handleUserSubmit(event, data);
  } catch (err) {
    console.error('[Agent] Submit error:', err);
    throw err;
  }
});
