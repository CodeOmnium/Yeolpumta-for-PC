const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 400,
        height: 700,
        minWidth: 350,
        backgroundColor: '#1e1e1e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    // Load the index.html file
    mainWindow.loadFile('index.html');

    // Remove menu bar
    mainWindow.setMenuBarVisibility(false);

    // Open DevTools in development mode
    // mainWindow.webContents.openDevTools();

    // Handle window close
    mainWindow.on('close', (e) => {
        // Only handle the close event if the app is not quitting
        // This prevents double-handling when the app is actually quitting
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.webContents.send('app-closing');

            // Give a small delay to ensure data is saved before closing
            setTimeout(() => {
                if (mainWindow) {
                    app.isQuitting = true; // Set flag to prevent recursion
                    mainWindow.close(); // Use close instead of destroy to trigger proper cleanup
                }
            }, 500); // Increased to 500ms to ensure data is saved
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create window when Electron is ready
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle before-quit event
app.on('before-quit', () => {
    // Set the flag to true to prevent the close handler from being triggered
    app.isQuitting = true;
});

// Handle IPC messages from renderer process
ipcMain.on('save-data', (event, data) => {
    // In a real app, you might save to a file or database
    // For now, we'll just acknowledge receipt
    event.reply('save-data-reply', { success: true });
});