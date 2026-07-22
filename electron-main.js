const { app, BrowserWindow } = require('electron');
const path = require('path');
const { createServer } = require('http');
const next = require('next');

// Set production environment
const isProd = process.env.NODE_ENV === 'production' || app.isPackaged;

// Set database path to userData directory to avoid read-only or permission issues in production
const dbPath = path.join(app.getPath('userData'), 'database', 'central.db');
process.env.DATABASE_PATH = dbPath;
console.log('[Electron] Database Path configured to:', dbPath);

let mainWindow;
let nextServer;

async function startServer() {
  const detectPort = require('detect-port').detect;
  // Next.js dev port is 3001 in package.json, so let's try 3001 first, otherwise find any free port
  const port = await detectPort(3001);
  console.log(`[Electron] Starting Next.js server on port ${port}...`);

  // Initialize Next.js app
  // When packaged, the directory is the app root
  const appDir = __dirname;
  const nextApp = next({ dev: !isProd, dir: appDir });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  return new Promise((resolve, reject) => {
    nextServer = createServer((req, res) => {
      // Custom route handler
      handle(req, res);
    });

    nextServer.listen(port, '127.0.0.1', (err) => {
      if (err) return reject(err);
      console.log(`[Electron] Next.js server listening on http://127.0.0.1:${port}`);
      resolve(port);
    });
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js')
    },
    title: 'Control de Eventos y Asistencias',
    autoHideMenuBar: true
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Preload script might be empty for now if we don't need IPC, but let's create a placeholder
app.whenReady().then(async () => {
  try {
    const port = await startServer();
    createWindow(port);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
    });
  } catch (error) {
    console.error('[Electron] Error starting server:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (nextServer) {
    nextServer.close();
  }
});
