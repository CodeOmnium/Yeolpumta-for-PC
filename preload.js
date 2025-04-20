// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron', {
        ipcRenderer: {
            send: (channel, data) => {
                // whitelist channels
                const validChannels = ['save-data'];
                if (validChannels.includes(channel)) {
                    ipcRenderer.send(channel, data);
                }
            },
            on: (channel, func) => {
                const validChannels = ['save-data-reply', 'app-closing'];
                if (validChannels.includes(channel)) {
                    // Deliberately strip event as it includes `sender`
                    ipcRenderer.on(channel, (event, ...args) => func(...args));
                }
            },
            // Allow removing listeners
            removeListener: (channel, func) => {
                const validChannels = ['save-data-reply', 'app-closing'];
                if (validChannels.includes(channel)) {
                    ipcRenderer.removeListener(channel, func);
                }
            }
        }
    }
);

window.addEventListener('DOMContentLoaded', () => {
    // Expose any Node.js APIs or custom functionality to the renderer process
    console.log('DOM fully loaded and parsed');
});