const { contextBridge, ipcRenderer } = require('electron');
const $ = require('jquery');

// Make jQuery available globally
window.$ = window.jQuery = $; 

// Expose update functionality to renderer
window.electron = {
    on: (channel, callback) => {
        ipcRenderer.on(channel, callback);
    },
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    }
}; 