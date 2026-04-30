import dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain, protocol, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { handleCancelAgent, handleStartAgent, handleUserSubmit } from './playwright/agent.js';
import { autoUpdater } from 'electron-updater';

// Load environment variables from .env.local
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env.local') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appIconPath = process.env.NODE_ENV === 'development'
  ? path.join(__dirname, '../../frontend/public/logo.png')
  : path.join(__dirname, '../frontend/out/logo.png');

let mainWindow;

/**
 * Setup IPC handlers for Playwright automation
 */
function setupIpcHandlers() {
  // Open external URL handler
  ipcMain.handle('open-external', async (event, url) => {
    try {
      await shell.openExternal(url);
    } catch (error) {
      console.error('Failed to open external url:', error);
    }
  });

  let authServer = null;

  ipcMain.handle('start-auth-server', () => {
    return new Promise((resolve) => {
      if (authServer) {
        authServer.close();
      }
      
      authServer = http.createServer((req, res) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          if (url.pathname === '/login-success') {
            const token = url.searchParams.get('token');
            const userStr = url.searchParams.get('user');
            
            if (mainWindow && token) {
              mainWindow.webContents.send('deep-link-auth', { 
                token, 
                user: userStr ? JSON.parse(decodeURIComponent(userStr)) : null 
              });
              
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.focus();
            }
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <head><title>Authentication Successful</title></head>
                <body style="font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff; margin: 0;">
                  <div style="text-align: center;">
                    <h2>Login Successful!</h2>
                    <p style="color: #888;">You can safely close this tab and return to Fillica.</p>
                    <script>setTimeout(() => window.close(), 2000);</script>
                  </div>
                </body>
              </html>
            `);
            
            // Shut down server after successful login
            setTimeout(() => {
              if (authServer) {
                authServer.close();
                authServer = null;
              }
            }, 1000);
          } else {
            res.writeHead(404);
            res.end();
          }
        } catch (e) {
          console.error(e);
          res.writeHead(500);
          res.end();
        }
      });

      // Listen on a random available port on localhost
      authServer.listen(0, '127.0.0.1', () => {
        const port = authServer.address().port;
        console.log('[Auth] Temporary auth server listening on port', port);
        resolve(port);
      });
    });
  });

  // Start automation handler
  ipcMain.handle('playwright:start', async (event, { jobId, userId, token, backendUrl }) => {
    try {
      return await handleStartAgent(event, { jobId, userId, token, backendUrl });
    } catch (error) {
      console.error('Playwright start error:', error);
      throw error;
    }
  });

  // Cancel automation handler
  ipcMain.handle('playwright:cancel', async (event, { jobId, userId }) => {
    try {
      return await handleCancelAgent(event, { jobId, userId });
    } catch (error) {
      console.error('Playwright cancel error:', error);
      throw error;
    }
  });

  // User submit handler
  ipcMain.handle('playwright:submit', async (event, data) => {
    try {
      return await handleUserSubmit(event, data);
    } catch (error) {
      console.error('Playwright submit error:', error);
      throw error;
    }
  });
}

/**
 * Create the main Electron window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Fillica',
    icon: appIconPath,
    webPreferences: {
      preload: (() => {
        const p = path.join(__dirname, '../preload/index.mjs');
        console.log('[DEBUG] Preload path resolved to:', p);
        return p;
      })(),
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: false,
    },
  });

  // Load the Next.js static export or dev server
  const startUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../frontend/out/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Force all links with target="_blank" (or window.open) to open in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    import('electron').then(({ shell }) => {
      shell.openExternal(url);
    });
    return { action: 'deny' };
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App ready
 */
app.on('ready', () => {
  app.setName('Fillica');
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIconPath);
  }
  setupIpcHandlers();
  createWindow();

  // --- Auto-Update (production only) ---
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.logger = console;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdate] Update available:', info.version);
    });
    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdate] Update downloaded. Will install on next restart.');
    });
    autoUpdater.on('error', (err) => {
      console.warn('[AutoUpdate] Error:', err.message);
    });

    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  }
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
