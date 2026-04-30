import dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain, protocol, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import http from 'http';
import { handleCancelAgent, handleStartAgent, handleUserSubmit } from './playwright/agent.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

// Load environment variables from .env.local
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env.local') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appIconPath = process.env.NODE_ENV === 'development'
  ? path.join(__dirname, '../../frontend/public/logo.png')
  : path.join(__dirname, '../../frontend/out/logo.png');

// MIME type map for the local static server
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

/**
 * Start a local static file server for the Next.js export.
 * This eliminates ALL file:// protocol issues (broken paths, CORS, cookies).
 */
function startStaticServer(staticDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // Strip query strings and hash
      let urlPath = req.url.split('?')[0].split('#')[0];
      
      // Decode URI components
      urlPath = decodeURIComponent(urlPath);
      
      // Map URL path to file path
      let filePath = path.join(staticDir, urlPath);
      
      // If directory, try index.html
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      
      // If no extension and file doesn't exist, try adding .html or /index.html
      if (!path.extname(filePath) && !fs.existsSync(filePath)) {
        if (fs.existsSync(filePath + '.html')) {
          filePath = filePath + '.html';
        } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
          filePath = path.join(filePath, 'index.html');
        }
      }
      
      // If file still doesn't exist, serve index.html for SPA-like navigation
      if (!fs.existsSync(filePath)) {
        filePath = path.join(staticDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    // Listen on random available port on localhost only
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log(`[Static Server] Serving ${staticDir} on http://127.0.0.1:${port}`);
      resolve(port);
    });
  });
}

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
function createWindow(startUrl) {
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

  console.log('[Main] Loading URL:', startUrl);
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

// Store the start URL so 'activate' can reuse it
let appStartUrl = null;

/**
 * App ready
 */
app.on('ready', async () => {
  app.setName('Fillica');
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIconPath);
  }
  setupIpcHandlers();

  // Determine the start URL
  if (process.env.NODE_ENV === 'development') {
    appStartUrl = 'http://localhost:3000';
  } else {
    // Start a local static server to serve the Next.js export
    // This eliminates ALL file:// protocol issues (broken paths, CORS, missing CSS)
    const staticDir = path.join(__dirname, '../../frontend/out');
    const port = await startStaticServer(staticDir);
    appStartUrl = `http://127.0.0.1:${port}`;
  }

  createWindow(appStartUrl);

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
  if (mainWindow === null && appStartUrl) {
    createWindow(appStartUrl);
  }
});
