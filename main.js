const { app, BrowserWindow } = require('electron');

function createWindow () {
    let win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            webSecurity: false
        }
    })

    win.loadFile('public/index.html');
    win.focus();
    // win.webContents.openDevTools();

    win.on('closed', () => {
        win = null;
        app.exit(0);
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
